import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { pruneObsoleteVersionedSnapshots } from "./snapshot-files.mjs";

const SNAPSHOT_STEMS = [
  "catalog",
  "catalog-overview",
  "catalog-list",
  "promotions",
];

function createTempDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "medsearch-snapshots-"));
}

function writeSnapshotSet(directory, version) {
  for (const stem of SNAPSHOT_STEMS) {
    fs.writeFileSync(path.join(directory, `${stem}.${version}.json`), "{}");
  }
}

test("removes only obsolete versioned snapshots after validating the current set", () => {
  const directory = createTempDirectory();
  try {
    const currentVersion = "20261023t154000000z";
    writeSnapshotSet(directory, currentVersion);
    writeSnapshotSet(directory, "20261022t154000000z");
    fs.writeFileSync(path.join(directory, "catalog.json"), "{}");
    fs.writeFileSync(path.join(directory, "notes.json"), "{}");
    fs.mkdirSync(path.join(directory, "catalog.20261021t154000000z.json"));

    assert.equal(
      pruneObsoleteVersionedSnapshots(directory, currentVersion),
      SNAPSHOT_STEMS.length,
    );
    for (const stem of SNAPSHOT_STEMS) {
      assert.equal(
        fs.existsSync(path.join(directory, `${stem}.${currentVersion}.json`)),
        true,
      );
      assert.equal(
        fs.existsSync(path.join(directory, `${stem}.20261022t154000000z.json`)),
        false,
      );
    }
    assert.equal(fs.existsSync(path.join(directory, "catalog.json")), true);
    assert.equal(fs.existsSync(path.join(directory, "notes.json")), true);
    assert.equal(
      fs.statSync(path.join(directory, "catalog.20261021t154000000z.json"))
        .isDirectory(),
      true,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("refuses pruning if any file in the current snapshot set is missing", () => {
  const directory = createTempDirectory();
  try {
    writeSnapshotSet(directory, "20261022t154000000z");
    for (const stem of SNAPSHOT_STEMS.slice(0, -1)) {
      fs.writeFileSync(
        path.join(directory, `${stem}.20261023t154000000z.json`),
        "{}",
      );
    }

    assert.throws(
      () => pruneObsoleteVersionedSnapshots(directory, "20261023t154000000z"),
      /promotions\.20261023t154000000z\.json is missing/u,
    );
    assert.equal(
      fs.existsSync(path.join(directory, "catalog.20261022t154000000z.json")),
      true,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
