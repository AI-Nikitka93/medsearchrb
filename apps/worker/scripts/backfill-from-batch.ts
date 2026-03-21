import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { WorkerBindings } from "../src/env";
import { ensureDbReady } from "../src/lib/db";
import { IngestService } from "../src/services/ingest-service";
import type { SourceBatch, SourceBatchEnvelope } from "../src/types/ingest";

type RuntimeEnv = WorkerBindings & {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  INGEST_SHARED_SECRET: string;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    batchFile: string;
    chunkSize: number;
  } = {
    batchFile:
      process.platform === "win32"
        ? path.join(
            os.homedir(),
            "AppData",
            "Local",
            "MedsearchRB",
            "scraper",
            "batches",
            "latest-source-batch.json",
          )
        : path.join(
            os.homedir(),
            ".local",
            "share",
            "MedsearchRB",
            "scraper",
            "batches",
            "latest-source-batch.json",
          ),
    chunkSize: 100,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--batch-file" && args[index + 1]) {
      options.batchFile = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--chunk-size" && args[index + 1]) {
      options.chunkSize = Number(args[index + 1]);
      index += 1;
    }
  }

  if (!Number.isFinite(options.chunkSize) || options.chunkSize <= 0) {
    throw new Error(`Invalid --chunk-size value: ${options.chunkSize}`);
  }

  return options;
}

function loadRootEnv(): RuntimeEnv {
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

  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN || !env.INGEST_SHARED_SECRET) {
    throw new Error("Missing Turso bindings in root env file");
  }

  return env as RuntimeEnv;
}

function loadEnvelope(batchFile: string): SourceBatchEnvelope {
  if (!fs.existsSync(batchFile)) {
    throw new Error(`Batch file not found: ${batchFile}`);
  }

  return JSON.parse(fs.readFileSync(batchFile, "utf8")) as SourceBatchEnvelope;
}

function toSourceBatches(payload: SourceBatchEnvelope): SourceBatch[] {
  return "sources" in payload ? payload.sources : [payload];
}

function uniqueClinicIds(batch: SourceBatch, doctors: SourceBatch["doctors"]) {
  const ids = new Set<string>();

  for (const doctor of doctors) {
    for (const clinicId of doctor.clinic_external_ids ?? []) {
      ids.add(clinicId);
    }
  }

  for (const promotion of batch.promotions ?? []) {
    if (promotion.clinic_external_id) {
      ids.add(promotion.clinic_external_id);
    }
  }

  return ids;
}

function chunkSourceBatch(batch: SourceBatch, chunkSize: number): SourceBatch[] {
  const doctors = batch.doctors ?? [];
  if (doctors.length === 0 || doctors.length <= chunkSize) {
    return [batch];
  }

  const chunks: SourceBatch[] = [];
  for (let index = 0; index < doctors.length; index += chunkSize) {
    const doctorSlice = doctors.slice(index, index + chunkSize);
    const doctorIds = new Set(doctorSlice.map((doctor) => doctor.external_id));
    const clinicIds = uniqueClinicIds(batch, doctorSlice);

    chunks.push({
      source: batch.source,
      captured_at: batch.captured_at,
      doctors: doctorSlice,
      clinics: (batch.clinics ?? []).filter((clinic) => clinicIds.has(clinic.external_id)),
      promotions: (batch.promotions ?? []).filter((promotion) =>
        promotion.clinic_external_id ? clinicIds.has(promotion.clinic_external_id) : index === 0,
      ),
      review_summaries: (batch.review_summaries ?? []).filter((review) => {
        if (review.subject_type === "doctor") {
          return doctorIds.has(review.subject_external_id);
        }

        if (review.subject_type === "clinic") {
          return clinicIds.has(review.subject_external_id);
        }

        return false;
      }),
      report: batch.report
        ? {
            ...batch.report,
            doctors_found: doctorSlice.length,
            clinics_found: (batch.clinics ?? []).filter((clinic) => clinicIds.has(clinic.external_id))
              .length,
            promotions_found: (batch.promotions ?? []).filter((promotion) =>
              promotion.clinic_external_id ? clinicIds.has(promotion.clinic_external_id) : index === 0,
            ).length,
            review_summaries_found: (batch.review_summaries ?? []).filter((review) => {
              if (review.subject_type === "doctor") {
                return doctorIds.has(review.subject_external_id);
              }

              if (review.subject_type === "clinic") {
                return clinicIds.has(review.subject_external_id);
              }

              return false;
            }).length,
            notes: [
              ...(batch.report.notes ?? []),
              `chunk ${Math.floor(index / chunkSize) + 1}/${Math.ceil(doctors.length / chunkSize)}`,
            ],
          }
        : null,
      batch_version: batch.batch_version,
    });
  }

  return chunks;
}

async function main() {
  const options = parseArgs();
  const env = loadRootEnv();
  const envelope = loadEnvelope(options.batchFile);
  const sourceBatches = toSourceBatches(envelope);
  const chunkedBatches = sourceBatches.flatMap((batch) => chunkSourceBatch(batch, options.chunkSize));

  console.log(
    JSON.stringify(
      {
        batchFile: options.batchFile,
        sourceCount: sourceBatches.length,
        chunkedBatchCount: chunkedBatches.length,
        chunkSize: options.chunkSize,
      },
      null,
      2,
    ),
  );

  const client = await ensureDbReady(env);
  const service = new IngestService();
  const totals = {
    processed_batches: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  for (let index = 0; index < chunkedBatches.length; index += 1) {
    const batch = chunkedBatches[index];
    const result = await service.ingest(
      client,
      {
        batch_count: 1,
        sources: [batch],
      },
      { githubRunId: null },
    );

    totals.processed_batches += result.processed_batches;
    totals.inserted += result.inserted;
    totals.updated += result.updated;
    totals.skipped += result.skipped;
    totals.errors += result.errors;

    console.log(
      JSON.stringify(
        {
          progress: `${index + 1}/${chunkedBatches.length}`,
          source: batch.source,
          doctors: batch.doctors.length,
          clinics: batch.clinics.length,
          promotions: batch.promotions.length,
          result,
        },
        null,
        2,
      ),
    );
  }

  console.log(JSON.stringify({ totals }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
