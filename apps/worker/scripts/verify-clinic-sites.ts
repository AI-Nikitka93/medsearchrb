import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { WorkerBindings } from "../src/env";
import { ensureDbReady } from "../src/lib/db";

type RuntimeEnv = WorkerBindings & {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
};

type VerifyOptions = {
  sourceName: string;
  limit: number | null;
  onlyMissing: boolean;
  clinicLike: string | null;
};

type ClinicRow = {
  clinic_id: string;
  clinic_name: string;
  current_site_url: string | null;
  source_url: string;
  external_key: string;
};

function parseArgs(): VerifyOptions {
  const args = process.argv.slice(2);
  const options: VerifyOptions = {
    sourceName: "ydoc",
    limit: null,
    onlyMissing: true,
    clinicLike: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source" && args[index + 1]) {
      options.sourceName = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--limit" && args[index + 1]) {
      const parsed = Number(args[index + 1]);
      options.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      index += 1;
      continue;
    }

    if (arg === "--all") {
      options.onlyMissing = false;
      continue;
    }

    if (arg === "--clinic-like" && args[index + 1]) {
      options.clinicLike = args[index + 1];
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

function extractOfficialSite(html: string): string | null {
  const metaMatch = html.match(
    /<meta\s+itemprop=["']url["']\s+content=["'](?<url>[^"']+)["']/iu,
  );
  const url = metaMatch?.groups?.url?.trim();
  if (!url || url.includes("ydoc.by")) {
    return null;
  }

  return url;
}

function extractAddress(html: string): string | null {
  const addressMatch = html.match(
    /itemprop=["']address["'][^>]*>(?<value>[^<]+)</iu,
  );
  const value = addressMatch?.groups?.value?.replace(/\s+/gu, " ").trim();
  return value || null;
}

function buildFallbackSourceUrl(row: ClinicRow): string {
  const externalKey = String(row.external_key ?? "");
  const match = externalKey.match(/^ydoc-lpu-(\d+)$/u);
  if (match) {
    return `https://ydoc.by/minsk/lpu/${match[1]}/`;
  }

  return String(row.source_url);
}

async function fetchClinicPage(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  const options = parseArgs();
  const env = loadRootEnv();
  const client = await ensureDbReady(env);

  const whereClauses = [
    "cs.source_name = ?",
    "(cs.source_url LIKE 'https://ydoc.by/minsk/lpu/%' OR cs.external_key LIKE 'ydoc-lpu-%')",
  ];
  if (options.onlyMissing) {
    whereClauses.push(
      "(c.site_url IS NULL OR c.site_url = 'https://ydoc.by/minsk/klinika/' OR c.site_url LIKE 'https://ydoc.by/%')",
    );
  }
  if (options.clinicLike) {
    whereClauses.push("c.normalized_name LIKE ?");
  }

  const sql = `
    SELECT
      c.id AS clinic_id,
      c.name AS clinic_name,
      c.site_url AS current_site_url,
      cs.source_url,
      cs.external_key
    FROM clinic_sources cs
    INNER JOIN clinics c ON c.id = cs.clinic_id
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY c.name ASC
    ${options.limit ? "LIMIT ?" : ""}
  `;

  const args: Array<string | number> = [options.sourceName];
  if (options.clinicLike) {
    args.push(`%${options.clinicLike}%`);
  }
  if (options.limit) {
    args.push(options.limit);
  }

  const result = await client.execute({ sql, args });
  const clinics = result.rows as unknown as ClinicRow[];

  const totals = {
    scanned: clinics.length,
    updated: 0,
    no_official_site: 0,
    failed: 0,
  };

  console.log(
    JSON.stringify(
      {
        source: options.sourceName,
        onlyMissing: options.onlyMissing,
        clinicLike: options.clinicLike,
        limit: options.limit,
        scanned: clinics.length,
      },
      null,
      2,
    ),
  );

  for (const clinic of clinics) {
    const startedAt = new Date().toISOString();
    const verificationRunId = crypto.randomUUID();
    try {
      const checkedUrl = buildFallbackSourceUrl(clinic);
      const html = await fetchClinicPage(checkedUrl);
      const officialSite = extractOfficialSite(html);
      const parsedAddress = extractAddress(html);
      const finishedAt = new Date().toISOString();

      if (officialSite) {
        const tx = await client.transaction("write");
        try {
          await tx.execute({
            sql: `
              UPDATE clinics
              SET site_url = ?,
                  official_verification_notes = ?,
                  address = COALESCE(?, address),
                  updated_at = ?
              WHERE id = ?
            `,
            args: [
              officialSite,
              "official site linked from ydoc clinic page",
              parsedAddress,
              finishedAt,
              clinic.clinic_id,
            ],
          });
          await tx.execute({
            sql: `
              INSERT INTO clinic_verification_runs (
                id, clinic_id, source_name, source_type, status, checked_url,
                matched_doctors_count, conflict_count, notes, started_at, finished_at, created_at
              )
              VALUES (?, ?, ?, 'aggregator', 'linked_official_site', ?, 0, 0, ?, ?, ?, ?)
            `,
            args: [
              verificationRunId,
              clinic.clinic_id,
              options.sourceName,
              checkedUrl,
              officialSite,
              startedAt,
              finishedAt,
              startedAt,
            ],
          });
          await tx.commit();
        } catch (error) {
          await tx.rollback();
          throw error;
        }

        totals.updated += 1;
        console.log(
          JSON.stringify(
            {
              clinic: clinic.clinic_name,
              source_url: checkedUrl,
              official_site: officialSite,
              status: "linked_official_site",
            },
            null,
            2,
          ),
        );
      } else {
        await client.execute({
          sql: `
            INSERT INTO clinic_verification_runs (
              id, clinic_id, source_name, source_type, status, checked_url,
              matched_doctors_count, conflict_count, notes, started_at, finished_at, created_at
            )
            VALUES (?, ?, ?, 'aggregator', 'no_official_site', ?, 0, 0, NULL, ?, ?, ?)
          `,
          args: [
            verificationRunId,
            clinic.clinic_id,
            options.sourceName,
            checkedUrl,
            startedAt,
            finishedAt,
            startedAt,
          ],
        });

        totals.no_official_site += 1;
      }
    } catch (error) {
      const finishedAt = new Date().toISOString();
      const checkedUrl = buildFallbackSourceUrl(clinic);
      await client.execute({
        sql: `
          INSERT INTO clinic_verification_runs (
            id, clinic_id, source_name, source_type, status, checked_url,
            matched_doctors_count, conflict_count, notes, started_at, finished_at, created_at
          )
          VALUES (?, ?, ?, 'aggregator', 'fetch_failed', ?, 0, 0, ?, ?, ?, ?)
        `,
        args: [
          crypto.randomUUID(),
          clinic.clinic_id,
          options.sourceName,
          checkedUrl,
          error instanceof Error ? error.message : "unknown fetch error",
          startedAt,
          finishedAt,
          startedAt,
        ],
      });

      totals.failed += 1;
      console.log(
        JSON.stringify(
          {
            clinic: clinic.clinic_name,
            source_url: checkedUrl,
            status: "fetch_failed",
            error: error instanceof Error ? error.message : "unknown fetch error",
          },
          null,
          2,
        ),
      );
    }

    await sleep(450);
  }

  console.log(JSON.stringify({ totals }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
