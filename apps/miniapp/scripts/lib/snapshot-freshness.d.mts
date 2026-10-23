export type SnapshotFreshness = "fresh" | "stale" | "unknown";

export const SNAPSHOT_MAX_AGE_MS: number;
export const SNAPSHOT_MAX_CLOCK_SKEW_MS: number;

export function classifySnapshotFreshness(
  generatedAt: unknown,
  now?: number,
): SnapshotFreshness;

export function classifySnapshotFallback(
  snapshot: {
    generatedAt: unknown;
    versionedGeneratedAt: unknown;
    expectedVersion: string | null;
    actualVersion: string | null;
    hasAllSnapshotFiles: boolean;
  },
  now?: number,
): SnapshotFreshness;
