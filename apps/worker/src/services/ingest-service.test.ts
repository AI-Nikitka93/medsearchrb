import { strict as assert } from "node:assert";
import { test } from "node:test";

import type { Client } from "@libsql/client/web";

import type { CatalogWriteRepository } from "../repositories/catalog-write-repository";
import { sourceBatchSchema, type SourceBatch } from "../types/ingest";
import type { PromotionAiService } from "./promotion-ai-service";
import { IngestService } from "./ingest-service";

const capturedAt = "2026-10-24T10:00:00.000Z";

function makeBatch(report: SourceBatch["report"]): SourceBatch {
  return {
    source: "test-source",
    captured_at: capturedAt,
    doctors: [],
    clinics: [],
    promotions: [],
    review_summaries: [],
    report,
  };
}

function makeClient(): Client {
  const transaction = {
    commit: async () => undefined,
    rollback: async () => undefined,
  };

  return {
    transaction: async () => transaction,
  } as unknown as Client;
}

function makeRepository(onReconcile: () => void): CatalogWriteRepository {
  return {
    getScrapeRunByBatchId: async () => null,
    insertScrapeRun: async () => undefined,
    deactivateMissingPromotionsForSource: async () => onReconcile(),
    completeScrapeRun: async () => undefined,
  } as unknown as CatalogWriteRepository;
}

function makeReport(overrides: Partial<NonNullable<SourceBatch["report"]>> = {}) {
  return {
    source: "test-source",
    status: "ok",
    notes: [],
    doctors_found: 0,
    clinics_found: 0,
    promotions_found: 0,
    promotions_complete: false,
    review_summaries_found: 0,
    started_at: capturedAt,
    ...overrides,
  };
}

test("legacy scrape reports default promotion completeness to false", () => {
  const batch = sourceBatchSchema.parse({
    source: "test-source",
    captured_at: capturedAt,
    report: {
      source: "test-source",
      status: "ok",
      started_at: capturedAt,
    },
  });

  assert.equal(batch.report?.promotions_complete, false);
});

test("failed scrapes never deactivate promotions", async () => {
  let reconciled = false;
  const service = new IngestService(
    makeRepository(() => {
      reconciled = true;
    }),
    {} as PromotionAiService,
  );

  const result = await service.ingest(
    makeClient(),
    makeBatch(makeReport({ status: "failed", promotions_complete: true })),
    { githubRunId: null },
  );

  assert.equal(result.skipped, 1);
  assert.equal(result.errors, 0);
  assert.equal(reconciled, false);
});

test("incomplete empty snapshots never deactivate promotions", async () => {
  let reconciled = false;
  const service = new IngestService(
    makeRepository(() => {
      reconciled = true;
    }),
    {} as PromotionAiService,
  );

  const result = await service.ingest(
    makeClient(),
    makeBatch(makeReport()),
    { githubRunId: null },
  );

  assert.equal(result.processed_batches, 1);
  assert.equal(reconciled, false);
});

test("complete empty snapshots may deactivate promotions", async () => {
  let reconciled = false;
  const service = new IngestService(
    makeRepository(() => {
      reconciled = true;
    }),
    {} as PromotionAiService,
  );

  const result = await service.ingest(
    makeClient(),
    makeBatch(makeReport({ promotions_complete: true })),
    { githubRunId: null },
  );

  assert.equal(result.processed_batches, 1);
  assert.equal(reconciled, true);
});

test("snapshot count mismatches never deactivate promotions", async () => {
  let reconciled = false;
  const service = new IngestService(
    makeRepository(() => {
      reconciled = true;
    }),
    {} as PromotionAiService,
  );

  await service.ingest(
    makeClient(),
    makeBatch(makeReport({ promotions_complete: true, promotions_found: 1 })),
    { githubRunId: null },
  );

  assert.equal(reconciled, false);
});
