export const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const SNAPSHOT_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

/** @typedef {"fresh" | "stale" | "unknown"} SnapshotFreshness */

/**
 * @param {unknown} generatedAt
 * @param {number} [now]
 * @returns {SnapshotFreshness}
 */
export function classifySnapshotFreshness(generatedAt, now = Date.now()) {
  if (typeof generatedAt !== "string" || !generatedAt.trim()) {
    return "unknown";
  }

  const timestamp = Date.parse(generatedAt);
  if (
    !Number.isFinite(timestamp) ||
    timestamp > now + SNAPSHOT_MAX_CLOCK_SKEW_MS
  ) {
    return "unknown";
  }

  return now - timestamp > SNAPSHOT_MAX_AGE_MS ? "stale" : "fresh";
}

/**
 * @param {{
 *   generatedAt: unknown;
 *   versionedGeneratedAt: unknown;
 *   expectedVersion: string | null;
 *   actualVersion: string | null;
 *   hasAllSnapshotFiles: boolean;
 * }} snapshot
 * @param {number} [now]
 * @returns {SnapshotFreshness}
 */
export function classifySnapshotFallback(
  {
    generatedAt,
    versionedGeneratedAt,
    expectedVersion,
    actualVersion,
    hasAllSnapshotFiles,
  },
  now = Date.now(),
) {
  if (
    !hasAllSnapshotFiles ||
    !expectedVersion ||
    expectedVersion !== actualVersion ||
    generatedAt !== versionedGeneratedAt
  ) {
    return "unknown";
  }

  return classifySnapshotFreshness(versionedGeneratedAt, now);
}
