import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifySnapshotFallback,
  classifySnapshotFreshness,
} from "./snapshot-freshness.mjs";

const now = Date.parse("2026-10-23T12:00:00.000Z");

test("classifies recent snapshots as fresh and snapshots older than 24 hours as stale", () => {
  assert.equal(
    classifySnapshotFreshness("2026-10-22T13:00:00.000Z", now),
    "fresh",
  );
  assert.equal(
    classifySnapshotFreshness("2026-10-22T11:59:59.000Z", now),
    "stale",
  );
});

test("rejects missing, invalid, and implausibly future timestamps", () => {
  for (const value of [null, "not-a-date", "2026-10-23T12:06:00.000Z"]) {
    assert.equal(classifySnapshotFreshness(value, now), "unknown");
  }
});

test("allows offline snapshot reuse only when the complete versioned set is aligned", () => {
  const generatedAt = "2026-10-23T11:59:59.000Z";
  const alignedSnapshot = {
    generatedAt,
    versionedGeneratedAt: generatedAt,
    expectedVersion: "20261023t115959000z",
    actualVersion: "20261023t115959000z",
    hasAllSnapshotFiles: true,
  };

  assert.equal(classifySnapshotFallback(alignedSnapshot, now), "fresh");
  assert.equal(
    classifySnapshotFallback(
      { ...alignedSnapshot, actualVersion: "20261022t115959000z" },
      now,
    ),
    "unknown",
  );
  assert.equal(
    classifySnapshotFallback(
      { ...alignedSnapshot, hasAllSnapshotFiles: false },
      now,
    ),
    "unknown",
  );
});

test("does not permit an aligned but expired snapshot set as an offline fallback", () => {
  const generatedAt = "2026-10-22T11:59:59.000Z";
  assert.equal(
    classifySnapshotFallback(
      {
        generatedAt,
        versionedGeneratedAt: generatedAt,
        expectedVersion: "20261022t115959000z",
        actualVersion: "20261022t115959000z",
        hasAllSnapshotFiles: true,
      },
      now,
    ),
    "stale",
  );
});
