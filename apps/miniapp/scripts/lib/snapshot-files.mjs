import fs from "node:fs";
import path from "node:path";

const SNAPSHOT_NAME_PATTERN =
  /^(catalog|catalog-overview|catalog-list|promotions)\.([a-z0-9]+)\.json$/u;
const SNAPSHOT_STEMS = [
  "catalog",
  "catalog-overview",
  "catalog-list",
  "promotions",
];

export function pruneObsoleteVersionedSnapshots(outputDir, currentVersion) {
  if (!/^[a-z0-9]+$/u.test(currentVersion)) {
    throw new Error("Cannot prune catalog snapshots without a valid version.");
  }

  const currentSnapshotNames = new Set(
    SNAPSHOT_STEMS.map((stem) => `${stem}.${currentVersion}.json`),
  );

  for (const name of currentSnapshotNames) {
    const filePath = path.join(outputDir, name);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error(
        `Cannot prune old catalog snapshots because ${name} is missing.`,
      );
    }
  }

  let removedCount = 0;
  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    const match = SNAPSHOT_NAME_PATTERN.exec(entry.name);
    if (!match || match[2] === currentVersion) {
      continue;
    }

    fs.unlinkSync(path.join(outputDir, entry.name));
    removedCount += 1;
  }

  return removedCount;
}
