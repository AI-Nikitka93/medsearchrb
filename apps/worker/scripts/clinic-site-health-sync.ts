import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { WorkerBindings } from "../src/env";
import { ensureDbReady } from "../src/lib/db";

type RuntimeEnv = WorkerBindings & {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
};

type HealthOptions = {
  limit: number | null;
  clinicLike: string | null;
  onlyDue: boolean;
  maxFailuresBeforeHide: number;
};

type ClinicRow = {
  clinic_id: string;
  clinic_name: string;
  site_url: string;
  site_health_status: string | null;
  site_failure_count: number | null;
  verification_status: string | null;
  is_hidden: number;
};

type HealthCheckResult = {
  healthStatus:
    | "healthy"
    | "redirected_external"
    | "blocked"
    | "invalid_http"
    | "parked"
    | "closed_signal"
    | "fetch_failed";
  httpStatus: number | null;
  finalUrl: string | null;
  errorMessage: string | null;
  note: string | null;
};

function parseArgs(): HealthOptions {
  const args = process.argv.slice(2);
  const options: HealthOptions = {
    limit: null,
    clinicLike: null,
    onlyDue: true,
    maxFailuresBeforeHide: 3,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--limit" && args[index + 1]) {
      const parsed = Number(args[index + 1]);
      options.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      index += 1;
      continue;
    }

    if (arg === "--clinic-like" && args[index + 1]) {
      options.clinicLike = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--all") {
      options.onlyDue = false;
      continue;
    }

    if (arg === "--max-failures" && args[index + 1]) {
      const parsed = Number(args[index + 1]);
      options.maxFailuresBeforeHide =
        Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 3;
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

function normalizeHost(input: string | null): string | null {
  if (!input) {
    return null;
  }

  try {
    return new URL(input).hostname.replace(/^www\./u, "").toLowerCase();
  } catch {
    return null;
  }
}

function bodyLooksClosed(bodyLower: string): boolean {
  const signals = [
    "больше не работает",
    "центр закрыт",
    "деятельность прекращена",
    "временно закрыт",
    "закрыт навсегда",
    "closed permanently",
    "permanently closed",
  ];

  return signals.some((signal) => bodyLower.includes(signal));
}

function bodyLooksParked(bodyLower: string, finalHost: string | null): boolean {
  const hostSignals = [
    "parkingcrew.net",
    "sedoparking.com",
    "reg.ru",
    "beget.com",
    "tilda.ws",
  ];

  if (finalHost && hostSignals.some((signal) => finalHost.includes(signal))) {
    return true;
  }

  const bodySignals = [
    "domain is parked",
    "this domain may be for sale",
    "buy this domain",
    "сайт продается",
    "домен продается",
    "парковка домена",
  ];

  return bodySignals.some((signal) => bodyLower.includes(signal));
}

async function fetchClinicSite(url: string): Promise<HealthCheckResult> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
  } catch (error) {
    return {
      healthStatus: "fetch_failed",
      httpStatus: null,
      finalUrl: null,
      errorMessage: error instanceof Error ? error.message : "unknown fetch error",
      note: null,
    };
  }

  const httpStatus = response.status;
  const finalUrl = response.url || url;
  const finalHost = normalizeHost(finalUrl);
  const sourceHost = normalizeHost(url);

  if (!response.ok) {
    if (httpStatus === 403 || httpStatus === 429) {
      return {
        healthStatus: "blocked",
        httpStatus,
        finalUrl,
        errorMessage: null,
        note: `HTTP ${httpStatus}`,
      };
    }

    if (httpStatus === 404 || httpStatus === 410) {
      return {
        healthStatus: "invalid_http",
        httpStatus,
        finalUrl,
        errorMessage: null,
        note: `HTTP ${httpStatus}`,
      };
    }

    return {
      healthStatus: "fetch_failed",
      httpStatus,
      finalUrl,
      errorMessage: `HTTP ${httpStatus}`,
      note: null,
    };
  }

  const html = await response.text();
  const bodyLower = html.toLowerCase();

  if (bodyLooksClosed(bodyLower)) {
    return {
      healthStatus: "closed_signal",
      httpStatus,
      finalUrl,
      errorMessage: null,
      note: "closure signal detected on clinic site",
    };
  }

  if (bodyLooksParked(bodyLower, finalHost)) {
    return {
      healthStatus: "parked",
      httpStatus,
      finalUrl,
      errorMessage: null,
      note: "parking or domain sale signal detected",
    };
  }

  if (
    sourceHost &&
    finalHost &&
    sourceHost !== finalHost &&
    !sourceHost.includes(finalHost) &&
    !finalHost.includes(sourceHost)
  ) {
    return {
      healthStatus: "redirected_external",
      httpStatus,
      finalUrl,
      errorMessage: null,
      note: `redirected from ${sourceHost} to ${finalHost}`,
    };
  }

  return {
    healthStatus: "healthy",
    httpStatus,
    finalUrl,
    errorMessage: null,
    note: null,
  };
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
    "site_url IS NOT NULL",
    "site_url <> ''",
    "site_url NOT LIKE 'https://ydoc.by/%'",
    "opt_out = 0",
  ];

  if (options.onlyDue) {
    whereClauses.push(
      "(" +
        [
          "site_last_checked_at IS NULL",
          "site_health_status IN ('fetch_failed', 'invalid_http', 'parked', 'closed_signal', 'blocked')",
          "datetime(site_last_checked_at) <= datetime('now', '-3 day')",
        ].join(" OR ") +
        ")",
    );
  }

  if (options.clinicLike) {
    whereClauses.push("normalized_name LIKE ?");
  }

  const sql = `
    SELECT
      id AS clinic_id,
      name AS clinic_name,
      site_url,
      site_health_status,
      site_failure_count,
      verification_status,
      is_hidden
    FROM clinics
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY coalesce(site_last_checked_at, '1970-01-01T00:00:00Z') ASC, name ASC
    ${options.limit ? "LIMIT ?" : ""}
  `;

  const args: Array<string | number> = [];
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
    healthy: 0,
    redirected_external: 0,
    blocked: 0,
    invalid_http: 0,
    parked: 0,
    closed_signal: 0,
    fetch_failed: 0,
    hidden: 0,
  };

  console.log(
    JSON.stringify(
      {
        onlyDue: options.onlyDue,
        clinicLike: options.clinicLike,
        limit: options.limit,
        maxFailuresBeforeHide: options.maxFailuresBeforeHide,
        scanned: clinics.length,
      },
      null,
      2,
    ),
  );

  for (const clinic of clinics) {
    const startedAt = new Date().toISOString();
    const verificationRunId = crypto.randomUUID();
    const check = await fetchClinicSite(clinic.site_url);
    const finishedAt = new Date().toISOString();

    const nextFailureCount =
      check.healthStatus === "healthy" || check.healthStatus === "redirected_external"
        ? 0
        : Number(clinic.site_failure_count ?? 0) + 1;

    const shouldHide =
      (check.healthStatus === "closed_signal" ||
        check.healthStatus === "parked" ||
        (check.healthStatus === "invalid_http" &&
          (check.httpStatus === 404 || check.httpStatus === 410))) &&
      nextFailureCount >= options.maxFailuresBeforeHide;

    const nextVerificationStatus = shouldHide
      ? "closed_or_invalid"
      : clinic.verification_status ?? "unverified";

    const tx = await client.transaction("write");
    try {
      await tx.execute({
        sql: `
          UPDATE clinics
          SET site_url = CASE
                WHEN ? IS NOT NULL AND ? NOT LIKE 'https://ydoc.by/%' THEN ?
                ELSE site_url
              END,
              site_health_status = ?,
              site_last_checked_at = ?,
              site_last_http_status = ?,
              site_last_error = ?,
              site_failure_count = ?,
              site_last_final_url = ?,
              verification_status = ?,
              official_last_verified_at = CASE
                WHEN ? IN ('healthy', 'redirected_external') THEN ?
                ELSE official_last_verified_at
              END,
              official_verification_notes = ?,
              is_hidden = CASE
                WHEN ? = 1 THEN 1
                ELSE is_hidden
              END,
              updated_at = ?
          WHERE id = ?
        `,
        args: [
          check.finalUrl,
          check.finalUrl,
          check.finalUrl,
          check.healthStatus,
          finishedAt,
          check.httpStatus,
          check.errorMessage,
          nextFailureCount,
          check.finalUrl,
          nextVerificationStatus,
          check.healthStatus,
          finishedAt,
          check.note ?? check.errorMessage,
          shouldHide ? 1 : 0,
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
          VALUES (?, ?, 'clinic-site-health-sync', 'official_site', ?, ?, 0, 0, ?, ?, ?, ?)
        `,
        args: [
          verificationRunId,
          clinic.clinic_id,
          check.healthStatus,
          clinic.site_url,
          check.note ?? check.errorMessage,
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

    totals[check.healthStatus] += 1;
    if (shouldHide) {
      totals.hidden += 1;
    }

    console.log(
      JSON.stringify(
        {
          clinic: clinic.clinic_name,
          checked_url: clinic.site_url,
          final_url: check.finalUrl,
          status: check.healthStatus,
          http_status: check.httpStatus,
          failure_count: nextFailureCount,
          hidden: shouldHide,
        },
        null,
        2,
      ),
    );

    await sleep(350);
  }

  console.log(JSON.stringify({ totals }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
