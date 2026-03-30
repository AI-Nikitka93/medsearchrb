import fs from "node:fs";
import path from "node:path";

type CoverageStatus =
  | "covered_live"
  | "source_in_sync_no_live_promo"
  | "robots_blocked_impl"
  | "source_impl_not_in_sync"
  | "no_source_match"
  | "no_site_url";

type ClinicCoverageRecord = {
  clinic_id: string;
  clinic_slug: string;
  clinic_name: string;
  address: string | null;
  site_url: string | null;
  site_host: string | null;
  doctors_count: number;
  has_live_promo: boolean;
  live_promo_count: number;
  matched_source_impls: string[];
  promo_sync_sources: string[];
  robots_blocked_sources: string[];
  status: CoverageStatus;
};

type CoverageReport = {
  summary: {
    generated_at: string | null;
  };
  clinics: ClinicCoverageRecord[];
};

type HostVerification = {
  host: string;
  base_url: string;
  clinics: string[];
  clinic_count: number;
  doctors_count: number;
  coverage_statuses: CoverageStatus[];
  fetch_ok: boolean;
  homepage_status: number | null;
  homepage_final_url: string | null;
  minsk_confirmed: boolean;
  minsk_evidence: string[];
  promo_signal: "yes" | "no" | "unclear";
  promo_signal_source: "homepage" | "promo_page" | "none" | "unclear";
  promo_evidence: string[];
  promo_page_url: string | null;
  promo_page_status: number | null;
  promo_page_verified: boolean;
  promo_page_kind: "promotions" | "news" | "unknown" | "none";
  notes: string[];
};

const MAX_CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 12000;
const PROMO_PATH_HINTS = [
  "/promotions/",
  "/promotions",
  "/promotion/",
  "/promotion",
  "/shares/",
  "/shares",
  "/sale/",
  "/sale",
  "/sales/",
  "/sales",
  "/akcii/",
  "/akcii",
  "/discounts/",
  "/discounts",
  "/news/",
  "/news",
];
const ERROR_PAGE_PATTERNS = [
  /\b404\b/u,
  /страниц[аы]\s+не\s+найден/u,
  /запрашиваем[а-я]+\s+страниц[аы]\s+не\s+существ/u,
  /page\s+not\s+found/u,
  /not\s+found/u,
];
const PROMO_PATTERNS = [
  /акци/u,
  /скидк/u,
  /выгод/u,
  /promotions/u,
  /shares/u,
  /sale/u,
];
const MINSK_PATTERNS = [
  /\bминск\b/u,
  /\bг минск\b/u,
  /\bг\. минск\b/u,
  /\bсурганова\b/u,
  /\bнезависимости\b/u,
  /\bпритыцкого\b/u,
];

function repoRoot() {
  return path.resolve(import.meta.dirname, "..", "..", "..");
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/<[^>]+>/gu, " ")
    .replace(/[^\p{L}\p{N}/:.?=&_-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractEvidenceLines(text: string, patterns: RegExp[], limit = 4) {
  const lines = text
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const results: string[] = [];

  for (const line of lines) {
    if (patterns.some((pattern) => pattern.test(line))) {
      results.push(line.slice(0, 220));
      if (results.length >= limit) {
        break;
      }
    }
  }

  return results;
}

function hasAnyPattern(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function isSameHost(leftUrl: string, rightUrl: string) {
  try {
    return new URL(leftUrl).host === new URL(rightUrl).host;
  } catch {
    return false;
  }
}

function classifyPromoPath(hint: string): HostVerification["promo_page_kind"] {
  if (/news/u.test(hint)) {
    return "news";
  }

  if (/promotions|promotion|shares|sale|sales|akcii|discounts/u.test(hint)) {
    return "promotions";
  }

  return "unknown";
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "MedsearchRB-WebVerify/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      text,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function buildHostGroups(report: CoverageReport) {
  const groups = new Map<
    string,
    {
      baseUrl: string;
      clinics: ClinicCoverageRecord[];
    }
  >();

  for (const clinic of report.clinics) {
    if (!clinic.site_url || !clinic.site_host) {
      continue;
    }

    const current = groups.get(clinic.site_host) ?? {
      baseUrl: clinic.site_url,
      clinics: [],
    };
    current.clinics.push(clinic);
    groups.set(clinic.site_host, current);
  }

  return [...groups.entries()]
    .map(([host, value]) => ({
      host,
      baseUrl: value.baseUrl,
      clinics: value.clinics.sort((left, right) =>
        right.doctors_count - left.doctors_count ||
        left.clinic_name.localeCompare(right.clinic_name, "ru"),
      ),
    }))
    .sort((left, right) => {
      const leftDoctors = left.clinics.reduce((sum, item) => sum + item.doctors_count, 0);
      const rightDoctors = right.clinics.reduce((sum, item) => sum + item.doctors_count, 0);
      return rightDoctors - leftDoctors || left.host.localeCompare(right.host, "en");
    });
}

async function verifyHost(args: {
  host: string;
  baseUrl: string;
  clinics: ClinicCoverageRecord[];
}): Promise<HostVerification> {
  const { host, baseUrl, clinics } = args;
  const notes: string[] = [];
  const clinicNames = unique(clinics.map((clinic) => clinic.clinic_name));
  const doctorsCount = clinics.reduce((sum, clinic) => sum + clinic.doctors_count, 0);
  const coverageStatuses = unique(clinics.map((clinic) => clinic.status));

  let homepage;
  try {
    homepage = await fetchText(baseUrl);
  } catch (error) {
    return {
      host,
      base_url: baseUrl,
      clinics: clinicNames,
      clinic_count: clinicNames.length,
      doctors_count: doctorsCount,
      coverage_statuses: coverageStatuses,
      fetch_ok: false,
      homepage_status: null,
      homepage_final_url: null,
      minsk_confirmed: clinics.some((clinic) =>
        normalizeText(clinic.address ?? "").includes("минск"),
      ),
      minsk_evidence: unique(
        clinics
          .map((clinic) => clinic.address)
          .filter((value): value is string => Boolean(value))
          .filter((value) => normalizeText(value).includes("минск"))
          .slice(0, 3),
      ),
      promo_signal: "unclear",
      promo_signal_source: "unclear",
      promo_evidence: [],
      promo_page_url: null,
      promo_page_status: null,
      promo_page_verified: false,
      promo_page_kind: "none",
      notes: [
        `homepage_fetch_failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  const normalizedHomepage = normalizeText(homepage.text);

  const minskEvidence = extractEvidenceLines(normalizedHomepage, MINSK_PATTERNS);
  if (minskEvidence.length === 0) {
    const localAddresses = clinics
      .map((clinic) => clinic.address)
      .filter((value): value is string => Boolean(value))
      .filter((value) => normalizeText(value).includes("минск"));
    minskEvidence.push(...unique(localAddresses).slice(0, 3));
  }

  let promoSignal: HostVerification["promo_signal"] = hasAnyPattern(
    normalizedHomepage,
    PROMO_PATTERNS,
  )
    ? "yes"
    : "no";
  let promoSignalSource: HostVerification["promo_signal_source"] =
    promoSignal === "yes" ? "homepage" : "none";
  const promoEvidence = extractEvidenceLines(normalizedHomepage, PROMO_PATTERNS);
  let promoPageUrl: string | null = null;
  let promoPageStatus: number | null = null;
  let promoPageVerified = false;
  let promoPageKind: HostVerification["promo_page_kind"] = "none";

  for (const hint of PROMO_PATH_HINTS) {
    try {
      const candidateUrl = new URL(hint, homepage.finalUrl).toString();
      const candidate = await fetchText(candidateUrl);
      const normalizedCandidate = normalizeText(candidate.text);
      const isErrorPage = hasAnyPattern(normalizedCandidate, ERROR_PAGE_PATTERNS);
      const hasPromoText = hasAnyPattern(normalizedCandidate, PROMO_PATTERNS);
      const sameHost = isSameHost(candidate.finalUrl, homepage.finalUrl);

      if (!candidate.ok || !sameHost || isErrorPage) {
        if (!candidate.ok || isErrorPage) {
          notes.push(`promo_hint_rejected:${hint}:status=${candidate.status}:error_page=${isErrorPage}`);
        }
        continue;
      }

      if (!hasPromoText) {
        continue;
      }

      promoSignal = "yes";
      promoSignalSource = "promo_page";
      promoPageUrl = candidate.finalUrl;
      promoPageStatus = candidate.status;
      promoPageVerified = true;
      promoPageKind = classifyPromoPath(hint);
      promoEvidence.push(
        ...extractEvidenceLines(normalizedCandidate, PROMO_PATTERNS, 3).map(
          (line) => `[promo-page] ${line}`,
        ),
      );
      break;
    } catch (error) {
      notes.push(
        `promo_hint_failed:${hint}:${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    host,
    base_url: baseUrl,
    clinics: clinicNames,
    clinic_count: clinicNames.length,
    doctors_count: doctorsCount,
    coverage_statuses: coverageStatuses,
    fetch_ok: homepage.ok,
    homepage_status: homepage.status,
    homepage_final_url: homepage.finalUrl,
    minsk_confirmed: minskEvidence.length > 0,
    minsk_evidence: minskEvidence.slice(0, 4),
    promo_signal: promoSignal,
    promo_signal_source: promoSignalSource,
    promo_evidence: unique(promoEvidence).slice(0, 5),
    promo_page_url: promoPageUrl,
    promo_page_status: promoPageStatus,
    promo_page_verified: promoPageVerified,
    promo_page_kind: promoPageKind,
    notes,
  };
}

async function promisePool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let index = 0;

  async function runOne() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runOne()));
  return results;
}

function buildMarkdown(summary: Record<string, unknown>, hosts: HostVerification[]) {
  const covered = hosts.filter((item) => item.promo_signal === "yes");
  const confirmedPromoPages = hosts.filter((item) => item.promo_page_verified);
  const noPromo = hosts.filter((item) => item.promo_signal === "no");
  const topUncovered = noPromo
    .sort((left, right) => right.doctors_count - left.doctors_count)
    .slice(0, 30);

  return `# Promo Web Verify

- Summary generated at: ${summary.generated_at}
- Verified hosts: ${summary.total_hosts}
- Hosts fetchable: ${summary.fetchable_hosts}
- Hosts confirmed in Minsk: ${summary.hosts_confirmed_in_minsk}
- Hosts with promo signal on official site: ${summary.hosts_with_promo_signal}
- Hosts with verified promo/news page: ${summary.hosts_with_verified_promo_page}
- Hosts with verified promotions page: ${summary.hosts_with_verified_promotions_page}
- Hosts with verified news page: ${summary.hosts_with_verified_news_page}

## Top hosts with verified promo/news page

${confirmedPromoPages
    .sort((left, right) => right.doctors_count - left.doctors_count)
    .slice(0, 20)
    .map(
      (item) =>
        `- ${item.host} | doctors=${item.doctors_count} | kind=${item.promo_page_kind} | promo_page=${item.promo_page_url ?? "none"} | status=${item.promo_page_status ?? "n/a"}`,
    )
    .join("\n")}

## Top uncovered hosts by doctor volume

${topUncovered
    .map(
      (item) =>
        `- ${item.host} | doctors=${item.doctors_count} | clinics=${item.clinic_count} | minsk=${item.minsk_confirmed ? "yes" : "no"} | site=${item.base_url}`,
    )
    .join("\n")}

## Sample hosts with promo signal

${covered
    .sort((left, right) => right.doctors_count - left.doctors_count)
    .slice(0, 20)
    .map(
      (item) =>
        `- ${item.host} | doctors=${item.doctors_count} | promo_page=${item.promo_page_url ?? item.homepage_final_url ?? item.base_url}`,
    )
    .join("\n")}
`;
}

async function main() {
  const root = repoRoot();
  const coveragePath = path.join(root, "docs", "promo-clinic-coverage.json");
  const docsDir = path.join(root, "docs");
  const jsonOutputPath = path.join(docsDir, "promo-web-verify.json");
  const markdownOutputPath = path.join(docsDir, "promo-web-verify.md");
  const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf8")) as CoverageReport;
  const hostGroups = buildHostGroups(coverage);
  const results = await promisePool(hostGroups, MAX_CONCURRENCY, verifyHost);

  const summary = {
    generated_at: new Date().toISOString(),
    source_snapshot_generated_at: coverage.summary.generated_at,
    total_hosts: results.length,
    fetchable_hosts: results.filter((item) => item.fetch_ok).length,
    hosts_confirmed_in_minsk: results.filter((item) => item.minsk_confirmed).length,
    hosts_with_promo_signal: results.filter((item) => item.promo_signal === "yes").length,
    hosts_with_verified_promo_page: results.filter((item) => item.promo_page_verified).length,
    hosts_with_verified_promotions_page: results.filter(
      (item) => item.promo_page_verified && item.promo_page_kind === "promotions",
    ).length,
    hosts_with_verified_news_page: results.filter(
      (item) => item.promo_page_verified && item.promo_page_kind === "news",
    ).length,
    hosts_without_promo_signal: results.filter((item) => item.promo_signal === "no").length,
  };

  fs.writeFileSync(
    jsonOutputPath,
    JSON.stringify(
      {
        summary,
        hosts: results,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(markdownOutputPath, buildMarkdown(summary, results));

  console.log(
    JSON.stringify(
      {
        json_output: jsonOutputPath,
        markdown_output: markdownOutputPath,
        summary,
      },
      null,
      2,
    ),
  );
}

void main();
