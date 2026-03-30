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

type WebVerifyReport = {
  summary: {
    generated_at: string;
    source_snapshot_generated_at: string | null;
  };
  hosts: HostVerification[];
};

type PriorityCandidate = {
  clinic_name: string;
  clinic_slug: string;
  site_url: string;
  site_host: string;
  address: string | null;
  doctors_count: number;
  current_status: CoverageStatus;
  matched_source_impls: string[];
  promo_sync_sources: string[];
  promo_signal: HostVerification["promo_signal"];
  promo_signal_source: HostVerification["promo_signal_source"];
  promo_page_url: string | null;
  promo_page_verified: boolean;
  promo_page_kind: HostVerification["promo_page_kind"];
  promo_evidence: string[];
  minsk_evidence: string[];
  priority_score: number;
  recommendation:
    | "add_source"
    | "review_existing_source"
    | "manual_research"
    | "homepage_signal_only";
};

const EXCLUDED_HOSTS = new Set(["instagram.com", "ydoc.by"]);

function repoRoot() {
  return path.resolve(import.meta.dirname, "..", "..", "..");
}

function readJsonFile<T>(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function csvEscape(value: string | number | null) {
  if (value === null) {
    return "";
  }

  const text = String(value);
  if (!/[",\n]/u.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function buildPriorityScore(args: {
  doctorsCount: number;
  promoSignal: HostVerification["promo_signal"];
  hasPromoPage: boolean;
  hasVerifiedPromoPage: boolean;
  status: CoverageStatus;
}) {
  let score = args.doctorsCount;

  if (args.promoSignal === "yes") {
    score += 100;
  } else if (args.promoSignal === "unclear") {
    score += 20;
  }

  if (args.hasPromoPage) {
    score += 50;
  }

  if (args.hasVerifiedPromoPage) {
    score += 80;
  }

  if (args.status === "no_source_match") {
    score += 30;
  }

  if (args.status === "source_in_sync_no_live_promo") {
    score += 10;
  }

  return score;
}

function buildMarkdown(args: {
  generatedAt: string;
  candidates: PriorityCandidate[];
  verifiedNewsOnly: PriorityCandidate[];
  homepageSignalOnly: PriorityCandidate[];
  reviewExisting: PriorityCandidate[];
}) {
  const { generatedAt, candidates, verifiedNewsOnly, homepageSignalOnly, reviewExisting } = args;

  return `# Promo Priority Report

- Generated at: ${generatedAt}
- Primary goal: choose the next clinics for promo-source expansion using official-site evidence

## Ready to add first

${candidates
    .slice(0, 25)
    .map(
      (item, index) =>
        `${index + 1}. ${item.clinic_name} | doctors=${item.doctors_count} | host=${item.site_host} | promo_page=${item.promo_page_url ?? "none"} | kind=${item.promo_page_kind} | site=${item.site_url}`,
    )
    .join("\n")}

## Verified news page only, promotions not confirmed

${verifiedNewsOnly
    .slice(0, 25)
    .map(
      (item, index) =>
        `${index + 1}. ${item.clinic_name} | doctors=${item.doctors_count} | host=${item.site_host} | promo_page=${item.promo_page_url ?? "none"} | kind=${item.promo_page_kind} | site=${item.site_url}`,
    )
    .join("\n")}

## Homepage signal only, manual verification still needed

${homepageSignalOnly
    .slice(0, 25)
    .map(
      (item, index) =>
        `${index + 1}. ${item.clinic_name} | doctors=${item.doctors_count} | host=${item.site_host} | signal_source=${item.promo_signal_source} | site=${item.site_url}`,
    )
    .join("\n")}

## Existing source needs review

${reviewExisting
    .slice(0, 20)
    .map(
      (item, index) =>
        `${index + 1}. ${item.clinic_name} | doctors=${item.doctors_count} | host=${item.site_host} | current_status=${item.current_status} | promo_page=${item.promo_page_url ?? "none"}`,
    )
    .join("\n")}
`;
}

async function main() {
  const root = repoRoot();
  const coveragePath = path.join(root, "docs", "promo-clinic-coverage.json");
  const webVerifyPath = path.join(root, "docs", "promo-web-verify.json");
  const docsDir = path.join(root, "docs");
  const jsonOutputPath = path.join(docsDir, "promo-priority-report.json");
  const csvOutputPath = path.join(docsDir, "promo-priority-report.csv");
  const markdownOutputPath = path.join(docsDir, "promo-priority-report.md");

  const coverage = readJsonFile<CoverageReport>(coveragePath);
  const webVerify = readJsonFile<WebVerifyReport>(webVerifyPath);
  const hostMap = new Map(webVerify.hosts.map((host) => [host.host, host]));

  const allCandidates = coverage.clinics
    .filter((clinic) => clinic.site_url && clinic.site_host)
    .filter((clinic) => !EXCLUDED_HOSTS.has(clinic.site_host!))
    .map((clinic) => {
      const host = hostMap.get(clinic.site_host!);
      if (!host) {
        return null;
      }

      const recommendation: PriorityCandidate["recommendation"] =
        clinic.status === "no_source_match"
          ? "add_source"
          : clinic.status === "source_in_sync_no_live_promo"
            ? "review_existing_source"
            : "manual_research";

      return {
        clinic_name: clinic.clinic_name,
        clinic_slug: clinic.clinic_slug,
        site_url: clinic.site_url!,
        site_host: clinic.site_host!,
        address: clinic.address,
        doctors_count: clinic.doctors_count,
        current_status: clinic.status,
        matched_source_impls: clinic.matched_source_impls,
        promo_sync_sources: clinic.promo_sync_sources,
        promo_signal: host.promo_signal,
        promo_signal_source: host.promo_signal_source,
        promo_page_url: host.promo_page_url,
        promo_page_verified: host.promo_page_verified,
        promo_page_kind: host.promo_page_kind,
        promo_evidence: host.promo_evidence,
        minsk_evidence: host.minsk_evidence,
        priority_score: buildPriorityScore({
          doctorsCount: clinic.doctors_count,
          promoSignal: host.promo_signal,
          hasPromoPage: Boolean(host.promo_page_url),
          hasVerifiedPromoPage: host.promo_page_verified,
          status: clinic.status,
        }),
        recommendation,
      } satisfies PriorityCandidate;
    })
    .filter((item): item is PriorityCandidate => Boolean(item));

  const readyToAdd = allCandidates
    .filter((item) => item.current_status === "no_source_match")
    .filter((item) => item.promo_page_verified)
    .filter((item) => item.promo_page_kind === "promotions")
    .sort((left, right) =>
      right.priority_score - left.priority_score ||
      left.clinic_name.localeCompare(right.clinic_name, "ru"),
    );

  const verifiedNewsOnly = allCandidates
    .filter((item) => item.current_status === "no_source_match")
    .filter((item) => item.promo_page_verified)
    .filter((item) => item.promo_page_kind === "news")
    .sort((left, right) =>
      right.priority_score - left.priority_score ||
      left.clinic_name.localeCompare(right.clinic_name, "ru"),
    );

  const homepageSignalOnly = allCandidates
    .filter((item) => item.current_status === "no_source_match")
    .filter((item) => item.promo_signal === "yes")
    .filter((item) => !item.promo_page_verified)
    .sort((left, right) =>
      right.priority_score - left.priority_score ||
      left.clinic_name.localeCompare(right.clinic_name, "ru"),
    );

  const reviewExisting = allCandidates
    .filter((item) => item.current_status === "source_in_sync_no_live_promo")
    .filter((item) => item.promo_page_verified || item.promo_signal === "yes")
    .sort((left, right) =>
      right.priority_score - left.priority_score ||
      left.clinic_name.localeCompare(right.clinic_name, "ru"),
    );

  const summary = {
    generated_at: new Date().toISOString(),
    source_snapshot_generated_at: coverage.summary.generated_at,
    ready_to_add_count: readyToAdd.length,
    verified_news_only_count: verifiedNewsOnly.length,
    homepage_signal_only_count: homepageSignalOnly.length,
    review_existing_count: reviewExisting.length,
  };

  fs.writeFileSync(
    jsonOutputPath,
    JSON.stringify(
      {
        summary,
        ready_to_add: readyToAdd,
        review_existing: reviewExisting,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    csvOutputPath,
    [
      [
        "bucket",
        "clinic_name",
        "doctors_count",
        "site_host",
        "site_url",
        "current_status",
        "promo_signal",
        "promo_signal_source",
        "promo_page_url",
        "promo_page_verified",
        "promo_page_kind",
        "priority_score",
      ].join(","),
      ...readyToAdd.map((item) =>
        [
          "ready_to_add",
          item.clinic_name,
          item.doctors_count,
          item.site_host,
          item.site_url,
          item.current_status,
          item.promo_signal,
          item.promo_signal_source,
          item.promo_page_url,
          item.promo_page_verified,
          item.promo_page_kind,
          item.priority_score,
        ]
          .map(csvEscape)
          .join(","),
      ),
      ...verifiedNewsOnly.map((item) =>
        [
          "verified_news_only",
          item.clinic_name,
          item.doctors_count,
          item.site_host,
          item.site_url,
          item.current_status,
          item.promo_signal,
          item.promo_signal_source,
          item.promo_page_url,
          item.promo_page_verified,
          item.promo_page_kind,
          item.priority_score,
        ]
          .map(csvEscape)
          .join(","),
      ),
      ...homepageSignalOnly.map((item) =>
        [
          "homepage_signal_only",
          item.clinic_name,
          item.doctors_count,
          item.site_host,
          item.site_url,
          item.current_status,
          item.promo_signal,
          item.promo_signal_source,
          item.promo_page_url,
          item.promo_page_verified,
          item.promo_page_kind,
          item.priority_score,
        ]
          .map(csvEscape)
          .join(","),
      ),
      ...reviewExisting.map((item) =>
        [
          "review_existing",
          item.clinic_name,
          item.doctors_count,
          item.site_host,
          item.site_url,
          item.current_status,
          item.promo_signal,
          item.promo_signal_source,
          item.promo_page_url,
          item.promo_page_verified,
          item.promo_page_kind,
          item.priority_score,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n"),
  );
  fs.writeFileSync(
    markdownOutputPath,
    buildMarkdown({
      generatedAt: summary.generated_at,
      candidates: readyToAdd,
      verifiedNewsOnly,
      homepageSignalOnly,
      reviewExisting,
    }),
  );

  console.log(
    JSON.stringify(
      {
        json_output: jsonOutputPath,
        csv_output: csvOutputPath,
        markdown_output: markdownOutputPath,
        summary,
        top_ready_to_add: readyToAdd.slice(0, 10).map((item) => ({
          clinic_name: item.clinic_name,
          doctors_count: item.doctors_count,
          site_host: item.site_host,
          promo_page_url: item.promo_page_url,
          promo_page_kind: item.promo_page_kind,
        })),
      },
      null,
      2,
    ),
  );
}

void main();
