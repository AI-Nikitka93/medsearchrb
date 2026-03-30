import fs from "node:fs";
import path from "node:path";

import type { WorkerBindings } from "../src/env";
import { ensureDbReady } from "../src/lib/db";
import { loadRootEnvFiles } from "./lib/load-root-env";

type RuntimeEnv = WorkerBindings & {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
};

type CleanupSummary = {
  removed_bad_specialties: number;
  removed_bad_specialty_links: number;
  hidden_low_quality_doctors: number;
};

function loadRootEnv(): RuntimeEnv {
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    return process.env as unknown as RuntimeEnv;
  }

  const env = loadRootEnvFiles(import.meta.url) as Partial<RuntimeEnv>;

  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error("Missing Turso bindings in root env file set (.env.local/.env/.env.txt)");
  }

  return env as RuntimeEnv;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

async function main() {
  const env = loadRootEnv();
  const db = await ensureDbReady(env);
  const tx = await db.transaction("write");
  const nowIso = new Date().toISOString();

  try {
    const badSpecialtyRows = await tx.execute(`
      SELECT id
      FROM specialties
      WHERE TRIM(name) = ''
         OR LOWER(TRIM(name)) LIKE '%<%'
         OR LOWER(TRIM(name)) LIKE '%>%'
         OR LOWER(TRIM(name)) LIKE '%script%'
         OR LOWER(TRIM(name)) LIKE '%doctype html%'
         OR LOWER(TRIM(name)) LIKE '%google tag manager%'
         OR LOWER(TRIM(name)) LIKE '%http://%'
         OR LOWER(TRIM(name)) LIKE '%https://%'
         OR LENGTH(TRIM(name)) > 120
    `);
    const badSpecialtyIds = badSpecialtyRows.rows.map((row) => String(row.id));

    let removedBadSpecialtyLinks = 0;
    let removedBadSpecialties = 0;
    if (badSpecialtyIds.length > 0) {
      const placeholders = badSpecialtyIds.map(() => "?").join(", ");
      const badLinks = await tx.execute({
        sql: `
          SELECT COUNT(*) AS value
          FROM doctor_specialties
          WHERE specialty_id IN (${placeholders})
        `,
        args: badSpecialtyIds,
      });
      removedBadSpecialtyLinks = toNumber(badLinks.rows[0]?.value ?? 0);

      await tx.execute({
        sql: `
          DELETE FROM doctor_specialties
          WHERE specialty_id IN (${placeholders})
        `,
        args: badSpecialtyIds,
      });

      await tx.execute({
        sql: `
          DELETE FROM specialties
          WHERE id IN (${placeholders})
        `,
        args: badSpecialtyIds,
      });
      removedBadSpecialties = badSpecialtyIds.length;
    }

    const lowQualityDoctorRows = await tx.execute(`
      SELECT d.id
      FROM doctors d
      WHERE d.is_hidden = 0
        AND d.opt_out = 0
        AND instr(TRIM(d.normalized_name), ' ') = 0
        AND NOT EXISTS (
          SELECT 1
          FROM doctor_clinics dc
          JOIN clinics c ON c.id = dc.clinic_id
          WHERE dc.doctor_id = d.id
            AND dc.is_active = 1
            AND c.is_hidden = 0
            AND c.opt_out = 0
        )
        AND NOT EXISTS (
          SELECT 1
          FROM doctor_sources ds
          WHERE ds.doctor_id = d.id
            AND COALESCE(ds.verified_on_clinic_site, 0) = 1
        )
    `);
    const lowQualityDoctorIds = lowQualityDoctorRows.rows.map((row) => String(row.id));

    let hiddenLowQualityDoctors = 0;
    if (lowQualityDoctorIds.length > 0) {
      const placeholders = lowQualityDoctorIds.map(() => "?").join(", ");
      await tx.execute({
        sql: `
          UPDATE doctors
          SET is_hidden = 1,
              updated_at = ?
          WHERE id IN (${placeholders})
        `,
        args: [nowIso, ...lowQualityDoctorIds],
      });
      hiddenLowQualityDoctors = lowQualityDoctorIds.length;
    }

    await tx.commit();

    const summary: CleanupSummary = {
      removed_bad_specialties: removedBadSpecialties,
      removed_bad_specialty_links: removedBadSpecialtyLinks,
      hidden_low_quality_doctors: hiddenLowQualityDoctors,
    };

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await tx.rollback().catch(() => undefined);
    throw error;
  }
}

await main();
