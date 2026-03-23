import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { WorkerBindings } from "../src/env";
import { ensureDbReady } from "../src/lib/db";

type RuntimeEnv = WorkerBindings & {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
};

type AuditOptions = {
  format: "json" | "markdown";
};

type ScalarRow = {
  value: unknown;
};

type SourceCountRow = {
  source_name: string;
  count: unknown;
};

type DistributionRow = {
  bucket: string | null;
  count: unknown;
};

type DuplicateDoctorRow = {
  normalized_name: string;
  doctor_count: unknown;
  sample_names: string | null;
};

type DuplicateClinicRow = {
  normalized_name: string;
  clinic_count: unknown;
  sample_names: string | null;
};

type AuditReport = {
  generated_at: string;
  summary: {
    doctors_visible: number;
    clinics_visible: number;
    promotions_active: number;
    doctors_without_active_clinic: number;
    doctors_without_reviews: number;
    doctors_with_single_review_source: number;
    doctors_with_multi_review_sources: number;
    doctors_with_verified_clinic_link: number;
    doctors_without_verified_clinic_link: number;
    duplicate_doctor_name_groups: number;
    duplicate_doctor_rows: number;
    duplicate_clinic_name_groups: number;
    duplicate_clinic_rows: number;
  };
  review_sources: Array<{ source_name: string; count: number }>;
  clinic_health_status: Array<{ bucket: string; count: number }>;
  clinic_verification_status: Array<{ bucket: string; count: number }>;
  active_promotions_by_source: Array<{ source_name: string; count: number }>;
  sample_duplicate_doctors: Array<{
    normalized_name: string;
    doctor_count: number;
    sample_names: string[];
  }>;
  sample_duplicate_clinics: Array<{
    normalized_name: string;
    clinic_count: number;
    sample_names: string[];
  }>;
};

function parseArgs(): AuditOptions {
  const args = process.argv.slice(2);
  const options: AuditOptions = {
    format: "json",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--format" && args[index + 1]) {
      const candidate = args[index + 1].toLowerCase();
      if (candidate === "json" || candidate === "markdown") {
        options.format = candidate;
      }

      index += 1;
    }
  }

  return options;
}

function loadRootEnv(): RuntimeEnv {
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    return process.env as unknown as RuntimeEnv;
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(scriptDir, "../../..");
  const candidatePaths = [path.join(root, ".env.txt"), path.join(root, ".env")];
  const envPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  if (!envPath) {
    throw new Error("Cannot find .env.txt or .env in project root");
  }

  const data = fs.readFileSync(envPath, "utf8");
  const env = Object.fromEntries(
    data
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const delimiter = line.indexOf("=");
        return [
          line.slice(0, delimiter).trim(),
          line.slice(delimiter + 1).trim().replace(/^"|"$/gu, ""),
        ];
      }),
  ) as Partial<RuntimeEnv>;

  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error("Missing Turso bindings in root env file");
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

function toBucket(value: string | null | undefined): string {
  if (!value || !value.trim()) {
    return "unknown";
  }

  return value;
}

function splitSamples(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(" || ")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function queryScalar(
  execute: ReturnType<typeof ensureDbReady> extends Promise<infer T>
    ? T["execute"]
    : never,
  sql: string,
): Promise<number> {
  const result = await execute(sql);
  return toNumber((result.rows[0] as ScalarRow | undefined)?.value ?? 0);
}

async function queryDistribution(
  execute: ReturnType<typeof ensureDbReady> extends Promise<infer T>
    ? T["execute"]
    : never,
  sql: string,
): Promise<Array<{ bucket: string; count: number }>> {
  const result = await execute(sql);
  return result.rows.map((row) => ({
    bucket: toBucket((row as DistributionRow).bucket),
    count: toNumber((row as DistributionRow).count),
  }));
}

async function querySourceCounts(
  execute: ReturnType<typeof ensureDbReady> extends Promise<infer T>
    ? T["execute"]
    : never,
  sql: string,
): Promise<Array<{ source_name: string; count: number }>> {
  const result = await execute(sql);
  return result.rows.map((row) => ({
    source_name: String((row as SourceCountRow).source_name),
    count: toNumber((row as SourceCountRow).count),
  }));
}

async function buildReport(): Promise<AuditReport> {
  const env = loadRootEnv();
  const db = await ensureDbReady(env);

  const [
    doctorsVisible,
    clinicsVisible,
    promotionsActive,
    doctorsWithoutActiveClinic,
    doctorsWithoutReviews,
    doctorsWithSingleReviewSource,
    doctorsWithMultiReviewSources,
    doctorsWithVerifiedClinicLink,
    doctorsWithoutVerifiedClinicLink,
    duplicateDoctorNameGroups,
    duplicateDoctorRows,
    duplicateClinicNameGroups,
    duplicateClinicRows,
    reviewSources,
    clinicHealthStatus,
    clinicVerificationStatus,
    activePromotionsBySource,
    duplicateDoctorSamplesResult,
    duplicateClinicSamplesResult,
  ] = await Promise.all([
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COUNT(*) AS value
        FROM doctors
        WHERE is_hidden = 0 AND opt_out = 0
      `,
    ),
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COUNT(*) AS value
        FROM clinics
        WHERE is_hidden = 0 AND opt_out = 0
      `,
    ),
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COUNT(*) AS value
        FROM promotions
        WHERE is_active = 1 AND is_hidden = 0
      `,
    ),
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COUNT(*) AS value
        FROM doctors d
        WHERE d.is_hidden = 0
          AND d.opt_out = 0
          AND NOT EXISTS (
            SELECT 1
            FROM doctor_clinics dc
            WHERE dc.doctor_id = d.id
              AND dc.is_active = 1
          )
      `,
    ),
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COUNT(*) AS value
        FROM doctors d
        WHERE d.is_hidden = 0
          AND d.opt_out = 0
          AND NOT EXISTS (
            SELECT 1
            FROM reviews_summary rs
            WHERE rs.doctor_id = d.id
              AND rs.reviews_count > 0
          )
      `,
    ),
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COUNT(*) AS value
        FROM (
          SELECT rs.doctor_id
          FROM reviews_summary rs
          JOIN doctors d ON d.id = rs.doctor_id
          WHERE d.is_hidden = 0
            AND d.opt_out = 0
            AND rs.reviews_count > 0
          GROUP BY rs.doctor_id
          HAVING COUNT(DISTINCT rs.source_name) = 1
        )
      `,
    ),
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COUNT(*) AS value
        FROM (
          SELECT rs.doctor_id
          FROM reviews_summary rs
          JOIN doctors d ON d.id = rs.doctor_id
          WHERE d.is_hidden = 0
            AND d.opt_out = 0
            AND rs.reviews_count > 0
          GROUP BY rs.doctor_id
          HAVING COUNT(DISTINCT rs.source_name) >= 2
        )
      `,
    ),
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COUNT(*) AS value
        FROM doctors d
        WHERE d.is_hidden = 0
          AND d.opt_out = 0
          AND EXISTS (
            SELECT 1
            FROM doctor_clinics dc
            WHERE dc.doctor_id = d.id
              AND dc.is_active = 1
              AND dc.verified_on_clinic_site = 1
          )
      `,
    ),
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COUNT(*) AS value
        FROM doctors d
        WHERE d.is_hidden = 0
          AND d.opt_out = 0
          AND NOT EXISTS (
            SELECT 1
            FROM doctor_clinics dc
            WHERE dc.doctor_id = d.id
              AND dc.is_active = 1
              AND dc.verified_on_clinic_site = 1
          )
      `,
    ),
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COUNT(*) AS value
        FROM (
          SELECT normalized_name
          FROM doctors
          WHERE is_hidden = 0 AND opt_out = 0
          GROUP BY normalized_name
          HAVING COUNT(*) > 1
        )
      `,
    ),
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COALESCE(SUM(doctor_count), 0) AS value
        FROM (
          SELECT COUNT(*) AS doctor_count
          FROM doctors
          WHERE is_hidden = 0 AND opt_out = 0
          GROUP BY normalized_name
          HAVING COUNT(*) > 1
        )
      `,
    ),
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COUNT(*) AS value
        FROM (
          SELECT normalized_name
          FROM clinics
          WHERE is_hidden = 0 AND opt_out = 0
          GROUP BY normalized_name
          HAVING COUNT(*) > 1
        )
      `,
    ),
    queryScalar(
      db.execute.bind(db),
      `
        SELECT COALESCE(SUM(clinic_count), 0) AS value
        FROM (
          SELECT COUNT(*) AS clinic_count
          FROM clinics
          WHERE is_hidden = 0 AND opt_out = 0
          GROUP BY normalized_name
          HAVING COUNT(*) > 1
        )
      `,
    ),
    querySourceCounts(
      db.execute.bind(db),
      `
        SELECT source_name, COUNT(DISTINCT doctor_id) AS count
        FROM reviews_summary
        WHERE doctor_id IS NOT NULL
          AND reviews_count > 0
        GROUP BY source_name
        ORDER BY count DESC, source_name ASC
      `,
    ),
    queryDistribution(
      db.execute.bind(db),
      `
        SELECT site_health_status AS bucket, COUNT(*) AS count
        FROM clinics
        GROUP BY site_health_status
        ORDER BY count DESC, bucket ASC
      `,
    ),
    queryDistribution(
      db.execute.bind(db),
      `
        SELECT verification_status AS bucket, COUNT(*) AS count
        FROM clinics
        GROUP BY verification_status
        ORDER BY count DESC, bucket ASC
      `,
    ),
    querySourceCounts(
      db.execute.bind(db),
      `
        SELECT source_name, COUNT(*) AS count
        FROM promotions
        WHERE is_active = 1 AND is_hidden = 0
        GROUP BY source_name
        ORDER BY count DESC, source_name ASC
      `,
    ),
    db.execute(`
      SELECT normalized_name,
             COUNT(*) AS doctor_count,
             group_concat(full_name, ' || ') AS sample_names
      FROM (
        SELECT normalized_name, full_name
        FROM doctors
        WHERE is_hidden = 0 AND opt_out = 0
        ORDER BY full_name ASC
      )
      GROUP BY normalized_name
      HAVING COUNT(*) > 1
      ORDER BY doctor_count DESC, normalized_name ASC
      LIMIT 10
    `),
    db.execute(`
      SELECT normalized_name,
             COUNT(*) AS clinic_count,
             group_concat(name, ' || ') AS sample_names
      FROM (
        SELECT normalized_name, name
        FROM clinics
        WHERE is_hidden = 0 AND opt_out = 0
        ORDER BY name ASC
      )
      GROUP BY normalized_name
      HAVING COUNT(*) > 1
      ORDER BY clinic_count DESC, normalized_name ASC
      LIMIT 10
    `),
  ]);

  const sampleDuplicateDoctors = duplicateDoctorSamplesResult.rows.map((row) => ({
    normalized_name: String((row as DuplicateDoctorRow).normalized_name),
    doctor_count: toNumber((row as DuplicateDoctorRow).doctor_count),
    sample_names: splitSamples((row as DuplicateDoctorRow).sample_names),
  }));

  const sampleDuplicateClinics = duplicateClinicSamplesResult.rows.map((row) => ({
    normalized_name: String((row as DuplicateClinicRow).normalized_name),
    clinic_count: toNumber((row as DuplicateClinicRow).clinic_count),
    sample_names: splitSamples((row as DuplicateClinicRow).sample_names),
  }));

  return {
    generated_at: new Date().toISOString(),
    summary: {
      doctors_visible: doctorsVisible,
      clinics_visible: clinicsVisible,
      promotions_active: promotionsActive,
      doctors_without_active_clinic: doctorsWithoutActiveClinic,
      doctors_without_reviews: doctorsWithoutReviews,
      doctors_with_single_review_source: doctorsWithSingleReviewSource,
      doctors_with_multi_review_sources: doctorsWithMultiReviewSources,
      doctors_with_verified_clinic_link: doctorsWithVerifiedClinicLink,
      doctors_without_verified_clinic_link: doctorsWithoutVerifiedClinicLink,
      duplicate_doctor_name_groups: duplicateDoctorNameGroups,
      duplicate_doctor_rows: duplicateDoctorRows,
      duplicate_clinic_name_groups: duplicateClinicNameGroups,
      duplicate_clinic_rows: duplicateClinicRows,
    },
    review_sources: reviewSources,
    clinic_health_status: clinicHealthStatus,
    clinic_verification_status: clinicVerificationStatus,
    active_promotions_by_source: activePromotionsBySource,
    sample_duplicate_doctors: sampleDuplicateDoctors,
    sample_duplicate_clinics: sampleDuplicateClinics,
  };
}

function renderMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`# Catalog Quality Audit`);
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`- Doctors visible: ${report.summary.doctors_visible}`);
  lines.push(`- Clinics visible: ${report.summary.clinics_visible}`);
  lines.push(`- Active promotions: ${report.summary.promotions_active}`);
  lines.push(`- Doctors without active clinic: ${report.summary.doctors_without_active_clinic}`);
  lines.push(`- Doctors without reviews: ${report.summary.doctors_without_reviews}`);
  lines.push(
    `- Doctors with single review source: ${report.summary.doctors_with_single_review_source}`,
  );
  lines.push(
    `- Doctors with multi review sources: ${report.summary.doctors_with_multi_review_sources}`,
  );
  lines.push(
    `- Doctors with verified clinic link: ${report.summary.doctors_with_verified_clinic_link}`,
  );
  lines.push(
    `- Doctors without verified clinic link: ${report.summary.doctors_without_verified_clinic_link}`,
  );
  lines.push(
    `- Duplicate doctor name groups: ${report.summary.duplicate_doctor_name_groups} (${report.summary.duplicate_doctor_rows} rows)`,
  );
  lines.push(
    `- Duplicate clinic name groups: ${report.summary.duplicate_clinic_name_groups} (${report.summary.duplicate_clinic_rows} rows)`,
  );
  lines.push("");

  const sections: Array<[string, Array<{ label: string; count: number }>]> = [
    [
      "Review sources",
      report.review_sources.map((item) => ({ label: item.source_name, count: item.count })),
    ],
    [
      "Clinic health status",
      report.clinic_health_status.map((item) => ({ label: item.bucket, count: item.count })),
    ],
    [
      "Clinic verification status",
      report.clinic_verification_status.map((item) => ({ label: item.bucket, count: item.count })),
    ],
    [
      "Active promotions by source",
      report.active_promotions_by_source.map((item) => ({
        label: item.source_name,
        count: item.count,
      })),
    ],
  ];

  for (const [title, items] of sections) {
    lines.push(`## ${title}`);
    lines.push("");
    for (const item of items) {
      lines.push(`- ${item.label}: ${item.count}`);
    }
    lines.push("");
  }

  lines.push("## Sample duplicate doctors");
  lines.push("");
  for (const item of report.sample_duplicate_doctors) {
    lines.push(`- ${item.normalized_name}: ${item.doctor_count} -> ${item.sample_names.join("; ")}`);
  }
  lines.push("");
  lines.push("## Sample duplicate clinics");
  lines.push("");
  for (const item of report.sample_duplicate_clinics) {
    lines.push(`- ${item.normalized_name}: ${item.clinic_count} -> ${item.sample_names.join("; ")}`);
  }

  return lines.join("\n");
}

async function main() {
  const options = parseArgs();
  const report = await buildReport();

  if (options.format === "markdown") {
    console.log(renderMarkdown(report));
    return;
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
