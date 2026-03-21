import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@libsql/client";

const workerRoot = process.cwd();
const repoRoot = path.resolve(workerRoot, "..", "..");
const migrationsDir = path.join(repoRoot, "db", "migrations");
const envFiles = [
  path.join(repoRoot, ".env"),
  path.join(repoRoot, ".env.txt"),
  path.join(workerRoot, ".dev.vars"),
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

for (const envFile of envFiles) {
  loadEnvFile(envFile);
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error(
    'BLOCKER: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing. Add them to ".env" or ".env.txt" at repo root, then rerun "db\\run.bat".',
  );
  process.exit(1);
}

const client = createClient({ url, authToken });
await client.execute("PRAGMA foreign_keys = ON");

await client.execute(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    file_name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )
`);

function splitSqlStatements(sqlText) {
  const statements = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let index = 0; index < sqlText.length; index += 1) {
    const char = sqlText[index];
    const prev = sqlText[index - 1];

    if (char === "'" && prev !== "\\" && !inDouble) {
      inSingle = !inSingle;
    } else if (char === '"' && prev !== "\\" && !inSingle) {
      inDouble = !inDouble;
    }

    if (char === ";" && !inSingle && !inDouble) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements;
}

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

const appliedRows = await client.execute(
  "SELECT file_name FROM schema_migrations ORDER BY file_name",
);
const appliedSet = new Set(
  appliedRows.rows.map((row) => String(row.file_name)),
);

for (const fileName of migrationFiles) {
  if (appliedSet.has(fileName)) {
    console.log(`Skipped migration: ${fileName}`);
    continue;
  }

  const fullPath = path.join(migrationsDir, fileName);
  const sqlText = fs.readFileSync(fullPath, "utf8");
  const statements = splitSqlStatements(sqlText);
  const tx = await client.transaction("write");

  try {
    for (const statement of statements) {
      await tx.execute(statement);
    }
    await tx.execute({
      sql: `
        INSERT INTO schema_migrations (file_name, applied_at)
        VALUES (?, ?)
      `,
      args: [fileName, new Date().toISOString()],
    });
    await tx.commit();
    console.log(`Applied migration: ${fileName}`);
  } catch (error) {
    await tx.rollback();
    console.error(`Failed migration: ${fileName}`);
    console.error(error);
    process.exit(1);
  }
}

console.log("Migrations complete.");
