import fs from "node:fs";
import path from "node:path";

import type { Client } from "@libsql/client/web";

import type { WorkerBindings } from "../src/env";
import { ensureDbReady } from "../src/lib/db";
import { loadRootEnvFiles } from "./lib/load-root-env";
import { CatalogWriteRepository } from "../src/repositories/catalog-write-repository";
import { sha256 } from "../src/utils/hash";
import {
  normalizeClinicName,
  normalizeText,
  significantNameTokens,
} from "../src/utils/normalize";

type RuntimeEnv = WorkerBindings & {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
};

type RemediateOptions = {
  dryRun: boolean;
  groupLimit: number;
  groupOffset: number;
  mergeLimit: number;
  orphanLimit: number;
  normalizedName?: string;
  skipOrphans: boolean;
};

type DuplicateGroupRow = {
  normalized_name: string;
  doctor_count: unknown;
};

type DoctorGroupRow = {
  id: string;
  full_name: string;
  normalized_name: string;
  created_at: string;
  updated_at: string;
  source_count: unknown;
  verified_source_count: unknown;
  active_clinic_count: unknown;
  verified_clinic_count: unknown;
  review_source_count: unknown;
  reviews_total: unknown;
  specialty_names: string | null;
  clinic_ids: string | null;
  clinic_names: string | null;
  source_names: string | null;
};

type OrphanSourceRow = {
  clinic_id: string | null;
  source_url: string | null;
  booking_url: string | null;
  profile_url: string | null;
  official_profile_url: string | null;
  source_type: string | null;
  verification_status: string | null;
  verified_on_clinic_site: unknown;
  last_verified_at: string | null;
  confidence_score: unknown;
  last_seen_at: string;
};

type DoctorCandidate = {
  id: string;
  fullName: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
  sourceCount: number;
  verifiedSourceCount: number;
  activeClinicCount: number;
  verifiedClinicCount: number;
  reviewSourceCount: number;
  reviewsTotal: number;
  specialtyNames: string[];
  clinicIds: string[];
  clinicNames: string[];
  sourceNames: string[];
};

type MergeDecision = {
  winnerId: string;
  loserId: string;
  normalizedName: string;
  reason: string;
  score: number;
};

function parseArgs(): RemediateOptions {
  const args = process.argv.slice(2);
  const readIntArg = (flag: string, fallback: number) => {
    const index = args.indexOf(flag);
    if (index === -1 || !args[index + 1]) {
      return fallback;
    }

    const parsed = Number.parseInt(args[index + 1], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const readStringArg = (flag: string) => {
    const index = args.indexOf(flag);
    if (index === -1 || !args[index + 1]) {
      return undefined;
    }

    const value = normalizeText(args[index + 1]);
    return value || undefined;
  };

  return {
    dryRun: args.includes("--dry-run"),
    groupLimit: readIntArg("--group-limit", 40),
    groupOffset: readIntArg("--group-offset", 0),
    mergeLimit: readIntArg("--merge-limit", 25),
    orphanLimit: readIntArg("--orphan-limit", 40),
    normalizedName: readStringArg("--normalized-name"),
    skipOrphans: args.includes("--skip-orphans"),
  };
}

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

function splitCsv(value: string | null | undefined) {
  return String(value ?? "")
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function normalizeSpecialty(value: string) {
  return normalizeText(value)
    .replace(/\bврач узд\b/gu, "врач узи")
    .replace(/\bоториноларинголог \(лор\)\b/gu, "лор")
    .replace(/\bакушер-гинеколог\b/gu, "гинеколог")
    .trim();
}

function nameTokenCount(value: string) {
  return value
    .split(/\s+/u)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function toDoctorCandidate(row: DoctorGroupRow): DoctorCandidate {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    normalizedName: String(row.normalized_name),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sourceCount: toNumber(row.source_count),
    verifiedSourceCount: toNumber(row.verified_source_count),
    activeClinicCount: toNumber(row.active_clinic_count),
    verifiedClinicCount: toNumber(row.verified_clinic_count),
    reviewSourceCount: toNumber(row.review_source_count),
    reviewsTotal: toNumber(row.reviews_total),
    specialtyNames: splitCsv(row.specialty_names).map(normalizeSpecialty),
    clinicIds: splitCsv(row.clinic_ids),
    clinicNames: Array.from(
      new Set(
        splitCsv(row.clinic_names)
          .map((item) => normalizeClinicName(item))
          .filter(Boolean),
      ),
    ),
    sourceNames: splitCsv(row.source_names),
  };
}

function compareDoctorPriority(left: DoctorCandidate, right: DoctorCandidate) {
  if (right.verifiedClinicCount !== left.verifiedClinicCount) {
    return right.verifiedClinicCount - left.verifiedClinicCount;
  }

  if (right.verifiedSourceCount !== left.verifiedSourceCount) {
    return right.verifiedSourceCount - left.verifiedSourceCount;
  }

  if (right.reviewSourceCount !== left.reviewSourceCount) {
    return right.reviewSourceCount - left.reviewSourceCount;
  }

  if (right.reviewsTotal !== left.reviewsTotal) {
    return right.reviewsTotal - left.reviewsTotal;
  }

  if (right.activeClinicCount !== left.activeClinicCount) {
    return right.activeClinicCount - left.activeClinicCount;
  }

  if (right.sourceCount !== left.sourceCount) {
    return right.sourceCount - left.sourceCount;
  }

  if (right.updatedAt !== left.updatedAt) {
    return right.updatedAt.localeCompare(left.updatedAt);
  }

  if (left.createdAt !== right.createdAt) {
    return left.createdAt.localeCompare(right.createdAt);
  }

  return left.id.localeCompare(right.id);
}

function buildMergeDecision(
  winner: DoctorCandidate,
  loser: DoctorCandidate,
): MergeDecision | null {
  const winnerClinics = new Set(winner.clinicIds);
  const loserClinics = new Set(loser.clinicIds);
  const winnerClinicNames = new Set(winner.clinicNames);
  const winnerSpecialties = new Set(winner.specialtyNames);
  const winnerClinicTokens = new Set(
    winner.clinicNames.flatMap((item) => significantNameTokens(item)),
  );

  const sharedClinicCount = loser.clinicIds.filter((item) => winnerClinics.has(item)).length;
  const sharedClinicNameCount = loser.clinicNames.filter((item) =>
    winnerClinicNames.has(item),
  ).length;
  const sharedClinicTokenCount = Array.from(
    new Set(
      loser.clinicNames.flatMap((item) =>
        significantNameTokens(item).filter((token) => winnerClinicTokens.has(token)),
      ),
    ),
  ).length;
  const sharedSpecialtyCount = loser.specialtyNames.filter(
    (item) =>
      winnerSpecialties.has(item) ||
      winner.specialtyNames.some(
        (candidate) => candidate.includes(item) || item.includes(candidate),
      ),
  ).length;
  const oneSideOrphan =
    (winner.activeClinicCount === 0 && loser.activeClinicCount > 0) ||
    (loser.activeClinicCount === 0 && winner.activeClinicCount > 0);
  const disjointSources =
    loser.sourceNames.length > 0 &&
    winner.sourceNames.length > 0 &&
    loser.sourceNames.every((item) => !winner.sourceNames.includes(item));

  let score = 0;
  if (sharedClinicCount > 0) {
    score += 6 + Math.min(2, sharedClinicCount - 1);
  }
  if (sharedClinicNameCount > 0) {
    score += 5 + Math.min(2, sharedClinicNameCount - 1);
  }
  if (sharedClinicTokenCount > 0) {
    score += 4 + Math.min(1, sharedClinicTokenCount - 1);
  }
  if (sharedSpecialtyCount > 0) {
    score += 4 + Math.min(1, sharedSpecialtyCount - 1);
  }
  if (oneSideOrphan) {
    score += 3;
  }
  if (winner.sourceCount > loser.sourceCount) {
    score += 1;
  }
  if (winner.reviewSourceCount > loser.reviewSourceCount) {
    score += 1;
  }
  if (disjointSources) {
    score += 2;
  }

  const hasReliableEvidence =
    sharedClinicCount > 0 ||
    sharedClinicNameCount > 0 ||
    sharedClinicTokenCount > 0 ||
    (oneSideOrphan && sharedSpecialtyCount > 0) ||
    (sharedSpecialtyCount > 0 && disjointSources && nameTokenCount(winner.normalizedName) >= 3);

  if (!hasReliableEvidence || score < 7) {
    return null;
  }

  const reasons: string[] = [];
  if (sharedClinicCount > 0) {
    reasons.push(`shared_clinics=${sharedClinicCount}`);
  }
  if (sharedClinicNameCount > 0) {
    reasons.push(`shared_clinic_names=${sharedClinicNameCount}`);
  }
  if (sharedClinicTokenCount > 0) {
    reasons.push(`shared_clinic_tokens=${sharedClinicTokenCount}`);
  }
  if (sharedSpecialtyCount > 0) {
    reasons.push(`shared_specialties=${sharedSpecialtyCount}`);
  }
  if (oneSideOrphan) {
    reasons.push("orphan_bridge");
  }
  if (disjointSources) {
    reasons.push("cross_source");
  }

  return {
    winnerId: winner.id,
    loserId: loser.id,
    normalizedName: winner.normalizedName,
    reason: reasons.join(","),
    score,
  };
}

async function queryDuplicateGroups(client: Client, options: RemediateOptions) {
  if (options.normalizedName) {
    const result = await client.execute({
      sql: `
        SELECT normalized_name, COUNT(*) AS doctor_count
        FROM doctors
        WHERE is_hidden = 0
          AND opt_out = 0
          AND normalized_name = ?
        GROUP BY normalized_name
        HAVING COUNT(*) > 1
      `,
      args: [options.normalizedName],
    });

    return result.rows.map((row) => row as unknown as DuplicateGroupRow);
  }

  const result = await client.execute({
    sql: `
      SELECT normalized_name, COUNT(*) AS doctor_count
      FROM doctors
      WHERE is_hidden = 0
        AND opt_out = 0
        AND normalized_name <> ''
        AND normalized_name LIKE '% %'
      GROUP BY normalized_name
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, normalized_name ASC
      LIMIT ? OFFSET ?
    `,
    args: [options.groupLimit, options.groupOffset],
  });

  return result.rows.map((row) => row as unknown as DuplicateGroupRow);
}

async function queryDoctorGroup(client: Client, normalizedName: string) {
  const result = await client.execute({
    sql: `
      WITH source_stats AS (
        SELECT doctor_id,
               COUNT(*) AS source_count,
               SUM(CASE WHEN verified_on_clinic_site = 1 THEN 1 ELSE 0 END) AS verified_source_count
        FROM doctor_sources
        GROUP BY doctor_id
      ),
      clinic_stats AS (
        SELECT doctor_id,
               COUNT(DISTINCT CASE WHEN is_active = 1 THEN clinic_id END) AS active_clinic_count,
               SUM(CASE WHEN is_active = 1 AND verified_on_clinic_site = 1 THEN 1 ELSE 0 END) AS verified_clinic_count,
               GROUP_CONCAT(DISTINCT CASE WHEN dc.is_active = 1 THEN dc.clinic_id END) AS clinic_ids,
               GROUP_CONCAT(DISTINCT CASE WHEN dc.is_active = 1 THEN c.normalized_name END) AS clinic_names
        FROM doctor_clinics dc
        LEFT JOIN clinics c ON c.id = dc.clinic_id
        GROUP BY doctor_id
      ),
      latest_reviews AS (
        SELECT doctor_id,
               source_name,
               reviews_count,
               ROW_NUMBER() OVER (
                 PARTITION BY doctor_id, source_name
                 ORDER BY captured_at DESC, updated_at DESC
               ) AS rn
        FROM reviews_summary
        WHERE doctor_id IS NOT NULL
      ),
      review_stats AS (
        SELECT doctor_id,
               COUNT(*) AS review_source_count,
               SUM(reviews_count) AS reviews_total
        FROM latest_reviews
        WHERE rn = 1
        GROUP BY doctor_id
      ),
      specialty_stats AS (
        SELECT ds.doctor_id,
               GROUP_CONCAT(DISTINCT s.normalized_name) AS specialty_names
        FROM doctor_specialties ds
        INNER JOIN specialties s ON s.id = ds.specialty_id
        GROUP BY ds.doctor_id
      ),
      source_names AS (
        SELECT doctor_id,
               GROUP_CONCAT(DISTINCT source_name) AS source_names
        FROM doctor_sources
        GROUP BY doctor_id
      )
      SELECT d.id,
             d.full_name,
             d.normalized_name,
             d.created_at,
             d.updated_at,
             COALESCE(ss.source_count, 0) AS source_count,
             COALESCE(ss.verified_source_count, 0) AS verified_source_count,
             COALESCE(cs.active_clinic_count, 0) AS active_clinic_count,
             COALESCE(cs.verified_clinic_count, 0) AS verified_clinic_count,
             COALESCE(rs.review_source_count, 0) AS review_source_count,
             COALESCE(rs.reviews_total, 0) AS reviews_total,
             COALESCE(sp.specialty_names, '') AS specialty_names,
             COALESCE(cs.clinic_ids, '') AS clinic_ids,
             COALESCE(cs.clinic_names, '') AS clinic_names,
             COALESCE(sn.source_names, '') AS source_names
      FROM doctors d
      LEFT JOIN source_stats ss ON ss.doctor_id = d.id
      LEFT JOIN clinic_stats cs ON cs.doctor_id = d.id
      LEFT JOIN review_stats rs ON rs.doctor_id = d.id
      LEFT JOIN specialty_stats sp ON sp.doctor_id = d.id
      LEFT JOIN source_names sn ON sn.doctor_id = d.id
      WHERE d.is_hidden = 0
        AND d.opt_out = 0
        AND d.normalized_name = ?
      ORDER BY d.id ASC
    `,
    args: [normalizedName],
  });

  return result.rows.map((row) => toDoctorCandidate(row as unknown as DoctorGroupRow));
}

async function mergeDoctors(
  client: Client,
  decision: MergeDecision,
) {
  const nowIso = new Date().toISOString();
  const tx = await client.transaction("write");

  try {
    await tx.execute({
      sql: `
        INSERT OR IGNORE INTO doctor_specialties (
          doctor_id, specialty_id, is_primary, source_count, created_at
        )
        SELECT ?, specialty_id, 0, source_count, created_at
        FROM doctor_specialties
        WHERE doctor_id = ?
      `,
      args: [decision.winnerId, decision.loserId],
    });

    await tx.execute({
      sql: `
        UPDATE doctor_sources
        SET doctor_id = ?
        WHERE doctor_id = ?
      `,
      args: [decision.winnerId, decision.loserId],
    });

    await tx.execute({
      sql: `
        UPDATE doctor_clinics
        SET doctor_id = ?,
            updated_at = ?
        WHERE doctor_id = ?
      `,
      args: [decision.winnerId, nowIso, decision.loserId],
    });

    await tx.execute({
      sql: `
        UPDATE reviews_summary
        SET doctor_id = ?,
            updated_at = ?
        WHERE doctor_id = ?
      `,
      args: [decision.winnerId, nowIso, decision.loserId],
    });

    await tx.execute({
      sql: `
        UPDATE promotions
        SET doctor_id = ?,
            updated_at = ?
        WHERE doctor_id = ?
      `,
      args: [decision.winnerId, nowIso, decision.loserId],
    });

    await tx.execute({
      sql: `
        DELETE FROM doctors
        WHERE id = ?
      `,
      args: [decision.loserId],
    });

    await tx.commit();
  } catch (error) {
    await tx.rollback().catch(() => undefined);
    throw error;
  }
}

async function queryOrphanDoctors(client: Client, options: RemediateOptions) {
  const result = await client.execute(`
    SELECT d.id
    FROM doctors d
    WHERE d.is_hidden = 0
      AND d.opt_out = 0
      AND NOT EXISTS (
        SELECT 1
        FROM doctor_clinics dc
        WHERE dc.doctor_id = d.id
          AND dc.is_active = 1
      )
      AND EXISTS (
        SELECT 1
        FROM doctor_sources ds
        WHERE ds.doctor_id = d.id
          AND ds.clinic_id IS NOT NULL
      )
    ORDER BY d.updated_at DESC
    LIMIT ${options.orphanLimit}
  `);

  return result.rows.map((row) => String((row as { id: string }).id));
}

async function queryOrphanSources(client: Client, doctorId: string) {
  const result = await client.execute({
    sql: `
      SELECT clinic_id,
             source_url,
             booking_url,
             profile_url,
             official_profile_url,
             source_type,
             verification_status,
             verified_on_clinic_site,
             last_verified_at,
             confidence_score,
             last_seen_at
      FROM doctor_sources
      WHERE doctor_id = ?
        AND clinic_id IS NOT NULL
      ORDER BY verified_on_clinic_site DESC, confidence_score DESC, last_seen_at DESC
    `,
    args: [doctorId],
  });

  return result.rows.map((row) => row as unknown as OrphanSourceRow);
}

async function restoreOrphanClinicLinks(
  client: Client,
  doctorId: string,
  repo: CatalogWriteRepository,
) {
  const sources = await queryOrphanSources(client, doctorId);
  const seenClinicIds = new Set<string>();
  let restoredCount = 0;

  for (const source of sources) {
    const clinicId = source.clinic_id ? String(source.clinic_id) : null;
    if (!clinicId || seenClinicIds.has(clinicId)) {
      continue;
    }
    seenClinicIds.add(clinicId);

    const relationSourceUrl =
      source.source_url ?? source.profile_url ?? source.booking_url ?? null;
    const relationKey = await sha256(
      `${doctorId}|${clinicId}|${relationSourceUrl ?? "source-link"}`,
    );
    const lastSeenAt = source.last_seen_at || new Date().toISOString();

    await repo.upsertDoctorClinic(client, {
      id: crypto.randomUUID(),
      relationKey,
      doctorId,
      clinicId,
      bookingUrl: source.booking_url ?? null,
      profileUrl: source.official_profile_url ?? source.profile_url ?? source.source_url ?? null,
      positionTitle: null,
      sourceType: source.source_type ?? "aggregator_profile",
      relationSourceUrl,
      officialProfileUrl: source.official_profile_url ?? null,
      officialBookingUrl: null,
      aggregatorProfileUrl: source.profile_url ?? source.source_url ?? null,
      aggregatorBookingUrl: source.booking_url ?? null,
      verifiedOnClinicSite: toNumber(source.verified_on_clinic_site) > 0 ? 1 : 0,
      verificationStatus: source.verification_status ?? "aggregator_only",
      lastVerifiedAt: source.last_verified_at ?? null,
      confidenceScore: Math.max(0.2, toNumber(source.confidence_score)),
      lastSeenAt,
    });
    restoredCount += 1;
  }

  return restoredCount;
}

async function main() {
  const options = parseArgs();
  const env = loadRootEnv();
  const client = await ensureDbReady(env);
  const repo = new CatalogWriteRepository();

  const duplicateGroups = await queryDuplicateGroups(client, options);
  const decisions: MergeDecision[] = [];

  for (const group of duplicateGroups) {
    const normalizedName = String(group.normalized_name);
    if (nameTokenCount(normalizedName) < 2) {
      continue;
    }

    const doctors = await queryDoctorGroup(client, normalizedName);
    if (doctors.length < 2) {
      continue;
    }

    doctors.sort(compareDoctorPriority);
    const winner = doctors[0];

    for (const loser of doctors.slice(1)) {
      const decision = buildMergeDecision(winner, loser);
      if (decision) {
        decisions.push(decision);
        if (decisions.length >= options.mergeLimit) {
          break;
        }
      }
    }

    if (decisions.length >= options.mergeLimit) {
      break;
    }
  }

  let appliedMerges = 0;
  if (!options.dryRun) {
    for (const decision of decisions) {
      await mergeDoctors(client, decision);
      appliedMerges += 1;
    }
  }

  const shouldProcessOrphans = !options.skipOrphans && !options.normalizedName;
  const orphanDoctorIds = shouldProcessOrphans
    ? await queryOrphanDoctors(client, options)
    : [];
  let restoredClinicLinks = 0;
  if (!options.dryRun) {
    for (const doctorId of orphanDoctorIds) {
      restoredClinicLinks += await restoreOrphanClinicLinks(client, doctorId, repo);
    }
  }

  const output = {
    generated_at: new Date().toISOString(),
    dry_run: options.dryRun,
    group_limit: options.groupLimit,
    group_offset: options.groupOffset,
    merge_limit: options.mergeLimit,
    orphan_limit: options.orphanLimit,
    normalized_name: options.normalizedName ?? null,
    skip_orphans: options.skipOrphans,
    duplicate_groups_scanned: duplicateGroups.length,
    merge_candidates: decisions.length,
    applied_merges: appliedMerges,
    orphan_doctors_with_source_clinic: orphanDoctorIds.length,
    restored_clinic_links: restoredClinicLinks,
    sample_merges: decisions.slice(0, 15),
  };

  console.log(JSON.stringify(output, null, 2));
}

await main();
