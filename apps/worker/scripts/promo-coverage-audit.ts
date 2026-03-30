import fs from "node:fs";
import path from "node:path";

type CatalogSnapshot = {
  generated_at: string | null;
  doctors: Array<{
    id: string;
    clinics: Array<{
      id: string;
      slug: string;
      name: string;
      address: string | null;
      site_url?: string | null;
    }>;
  }>;
};

type PromotionsSnapshot = {
  generated_at: string | null;
  items: Array<{
    id: string;
    title: string;
    source_url: string;
    clinic: {
      id: string;
      slug: string;
      name: string;
    };
  }>;
};

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

type ScraperDescriptor = {
  sourceName: string;
  baseUrl: string | null;
  host: string | null;
};

const KNOWN_ROBOTS_BLOCKED_PROMO_SOURCES = new Set(["happyderm", "klinik"]);
const PROMO_SOURCE_EXCLUSIONS = new Set(["103.by", "2doc.by", "doktora.by", "ydoc"]);

function repoRoot() {
  return path.resolve(import.meta.dirname, "..", "..", "..");
}

function normalizeHost(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return parsed.hostname.replace(/^www\./u, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function csvEscape(value: string | number | boolean | null) {
  if (value === null) {
    return "";
  }

  const text = String(value);
  if (!/[",\n]/u.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function readJsonFile<T>(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function parsePromoSyncSources(workflowPath: string) {
  const raw = fs.readFileSync(workflowPath, "utf8");
  const match = raw.match(/--sources\s+([^\n\r]+)/u);
  if (!match) {
    throw new Error(`Could not find --sources in ${workflowPath}`);
  }

  return match[1]
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function parseConfiguredSources(configPath: string) {
  const raw = fs.readFileSync(configPath, "utf8");
  const lines = raw.split(/\r?\n/u);
  const sources = new Set<string>();
  let insideSources = false;

  for (const line of lines) {
    if (!insideSources) {
      if (/^sources:\s*$/u.test(line)) {
        insideSources = true;
      }
      continue;
    }

    if (/^\S/u.test(line)) {
      break;
    }

    const match = line.match(/^ {2}"?([A-Za-z0-9._-]+)"?:\s*$/u);
    if (match) {
      const sourceName = match[1].trim();
      if (!PROMO_SOURCE_EXCLUSIONS.has(sourceName)) {
        sources.add(sourceName);
      }
    }
  }

  return [...sources].sort((left, right) => left.localeCompare(right, "en"));
}

function parseScraperDescriptors(scrapersDir: string) {
  const descriptors: ScraperDescriptor[] = [];

  for (const entry of fs.readdirSync(scrapersDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".py") || entry.name === "__init__.py") {
      continue;
    }

    const filePath = path.join(scrapersDir, entry.name);
    const raw = fs.readFileSync(filePath, "utf8");
    const sourceNameMatch = raw.match(/source_name\s*=\s*"([^"]+)"/u);
    if (!sourceNameMatch) {
      continue;
    }

    const sourceName = sourceNameMatch[1];
    if (PROMO_SOURCE_EXCLUSIONS.has(sourceName)) {
      continue;
    }

    const baseUrlMatch = raw.match(/base_url\s*=\s*"([^"]+)"/u);
    const baseUrl = baseUrlMatch?.[1] ?? null;
    descriptors.push({
      sourceName,
      baseUrl,
      host: normalizeHost(baseUrl),
    });
  }

  return descriptors.sort((left, right) =>
    left.sourceName.localeCompare(right.sourceName, "en"),
  );
}

function findMatchingSources(
  clinicName: string,
  siteHost: string | null,
  scrapers: ScraperDescriptor[],
) {
  const normalizedClinicName = normalizeText(clinicName);

  return scrapers
    .filter((scraper) => {
      if (siteHost && scraper.host) {
        return (
          siteHost === scraper.host ||
          siteHost.endsWith(`.${scraper.host}`) ||
          scraper.host.endsWith(`.${siteHost}`)
        );
      }

      return normalizedClinicName.includes(normalizeText(scraper.sourceName));
    })
    .map((scraper) => scraper.sourceName);
}

function determineStatus(record: Omit<ClinicCoverageRecord, "status">): CoverageStatus {
  if (record.has_live_promo) {
    return "covered_live";
  }

  if (record.robots_blocked_sources.length > 0) {
    return "robots_blocked_impl";
  }

  if (record.promo_sync_sources.length > 0) {
    return "source_in_sync_no_live_promo";
  }

  if (record.matched_source_impls.length > 0) {
    return "source_impl_not_in_sync";
  }

  if (!record.site_url) {
    return "no_site_url";
  }

  return "no_source_match";
}

function buildMarkdownReport(args: {
  generatedAt: string | null;
  records: ClinicCoverageRecord[];
  configuredSources: string[];
  promoSyncSources: string[];
}) {
  const { generatedAt, records, configuredSources, promoSyncSources } = args;
  const counts = new Map<CoverageStatus, number>();

  for (const record of records) {
    counts.set(record.status, (counts.get(record.status) ?? 0) + 1);
  }

  const covered = counts.get("covered_live") ?? 0;
  const inSyncNoPromo = counts.get("source_in_sync_no_live_promo") ?? 0;
  const robotsBlocked = counts.get("robots_blocked_impl") ?? 0;
  const noSourceMatch = counts.get("no_source_match") ?? 0;
  const noSiteUrl = counts.get("no_site_url") ?? 0;
  const sourceImplNotInSync = counts.get("source_impl_not_in_sync") ?? 0;
  const sampleMissing = records
    .filter((record) =>
      record.status === "no_source_match" || record.status === "no_site_url",
    )
    .slice(0, 30);

  return `# Promo Clinic Coverage Audit

- Generated at: ${generatedAt ?? "unknown"}
- Clinics in current Minsk catalog: ${records.length}
- Clinics with live promotions: ${covered}
- Clinics with promo source already in sync but no live promo right now: ${inSyncNoPromo}
- Clinics with implemented scraper blocked by robots: ${robotsBlocked}
- Clinics with implemented scraper not in promo-sync: ${sourceImplNotInSync}
- Clinics without matched promo source: ${noSourceMatch}
- Clinics without official site URL in snapshot: ${noSiteUrl}

## Promo Source Coverage

- Configured promo-capable source implementations: ${configuredSources.length}
- Sources currently in promo-sync workflow: ${promoSyncSources.length}
- Sources verified as robots-blocked and excluded from safe automation: ${[
    ...KNOWN_ROBOTS_BLOCKED_PROMO_SOURCES,
  ].join(", ")}

### Sources currently in promo-sync

${promoSyncSources.map((source) => `- ${source}`).join("\n")}

### Implemented promo sources in config

${configuredSources.map((source) => `- ${source}`).join("\n")}

## Sample uncovered clinics

${sampleMissing
    .map(
      (record) =>
        `- ${record.clinic_name} | status=${record.status} | site=${record.site_url ?? "missing"} | doctors=${record.doctors_count}`,
    )
    .join("\n")}

## Full machine-readable list

- JSON: \`docs/promo-clinic-coverage.json\`
- CSV: \`docs/promo-clinic-coverage.csv\`
`;
}

async function main() {
  const root = repoRoot();
  const catalogPath = path.join(root, "apps", "miniapp", "public", "data", "catalog.json");
  const promotionsPath = path.join(root, "apps", "miniapp", "public", "data", "promotions.json");
  const workflowPath = path.join(root, ".github", "workflows", "promo-sync.yml");
  const configPath = path.join(root, "config.yaml");
  const scrapersDir = path.join(root, "apps", "scrapers", "scrapers");
  const docsDir = path.join(root, "docs");
  const jsonOutputPath = path.join(docsDir, "promo-clinic-coverage.json");
  const csvOutputPath = path.join(docsDir, "promo-clinic-coverage.csv");
  const markdownOutputPath = path.join(docsDir, "promo-clinic-coverage.md");

  const catalog = readJsonFile<CatalogSnapshot>(catalogPath);
  const promotions = readJsonFile<PromotionsSnapshot>(promotionsPath);
  const promoSyncSources = parsePromoSyncSources(workflowPath);
  const configuredSources = parseConfiguredSources(configPath);
  const scraperDescriptors = parseScraperDescriptors(scrapersDir);
  const promoCountByClinicId = new Map<string, number>();

  for (const promotion of promotions.items) {
    promoCountByClinicId.set(
      promotion.clinic.id,
      (promoCountByClinicId.get(promotion.clinic.id) ?? 0) + 1,
    );
  }

  const clinicMap = new Map<
    string,
    {
      clinic_id: string;
      clinic_slug: string;
      clinic_name: string;
      address: string | null;
      site_url: string | null;
      doctorIds: Set<string>;
    }
  >();

  for (const doctor of catalog.doctors) {
    for (const clinic of doctor.clinics) {
      const current = clinicMap.get(clinic.id) ?? {
        clinic_id: clinic.id,
        clinic_slug: clinic.slug,
        clinic_name: clinic.name,
        address: clinic.address ?? null,
        site_url: clinic.site_url ?? null,
        doctorIds: new Set<string>(),
      };

      current.doctorIds.add(doctor.id);

      if (!current.address && clinic.address) {
        current.address = clinic.address;
      }

      if (!current.site_url && clinic.site_url) {
        current.site_url = clinic.site_url;
      }

      clinicMap.set(clinic.id, current);
    }
  }

  const records: ClinicCoverageRecord[] = [...clinicMap.values()]
    .map((clinic) => {
      const siteHost = normalizeHost(clinic.site_url);
      const matchedSourceImpls = findMatchingSources(
        clinic.clinic_name,
        siteHost,
        scraperDescriptors,
      );
      const promoSyncMatches = matchedSourceImpls.filter((source) =>
        promoSyncSources.includes(source),
      );
      const robotsBlockedSources = matchedSourceImpls.filter((source) =>
        KNOWN_ROBOTS_BLOCKED_PROMO_SOURCES.has(source),
      );
      const baseRecord = {
        clinic_id: clinic.clinic_id,
        clinic_slug: clinic.clinic_slug,
        clinic_name: clinic.clinic_name,
        address: clinic.address,
        site_url: clinic.site_url,
        site_host: siteHost,
        doctors_count: clinic.doctorIds.size,
        has_live_promo: promoCountByClinicId.has(clinic.clinic_id),
        live_promo_count: promoCountByClinicId.get(clinic.clinic_id) ?? 0,
        matched_source_impls: matchedSourceImpls,
        promo_sync_sources: promoSyncMatches,
        robots_blocked_sources: robotsBlockedSources,
      };

      return {
        ...baseRecord,
        status: determineStatus(baseRecord),
      };
    })
    .sort((left, right) => left.clinic_name.localeCompare(right.clinic_name, "ru"));

  const summary = {
    generated_at: catalog.generated_at ?? promotions.generated_at ?? null,
    total_clinics: records.length,
    clinics_with_live_promotions: records.filter((record) => record.has_live_promo).length,
    clinics_with_promo_source_in_sync: records.filter(
      (record) => record.promo_sync_sources.length > 0,
    ).length,
    clinics_with_source_impl: records.filter(
      (record) => record.matched_source_impls.length > 0,
    ).length,
    clinics_without_source_match: records.filter(
      (record) => record.status === "no_source_match",
    ).length,
    clinics_without_site_url: records.filter((record) => record.status === "no_site_url")
      .length,
    robots_blocked_sources: [...KNOWN_ROBOTS_BLOCKED_PROMO_SOURCES],
    configured_promo_sources: configuredSources,
    promo_sync_sources: promoSyncSources,
  };

  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(
    jsonOutputPath,
    JSON.stringify(
      {
        summary,
        clinics: records,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    csvOutputPath,
    [
      [
        "clinic_id",
        "clinic_name",
        "address",
        "site_url",
        "site_host",
        "doctors_count",
        "has_live_promo",
        "live_promo_count",
        "status",
        "matched_source_impls",
        "promo_sync_sources",
        "robots_blocked_sources",
      ].join(","),
      ...records.map((record) =>
        [
          record.clinic_id,
          record.clinic_name,
          record.address,
          record.site_url,
          record.site_host,
          record.doctors_count,
          record.has_live_promo,
          record.live_promo_count,
          record.status,
          record.matched_source_impls.join("|"),
          record.promo_sync_sources.join("|"),
          record.robots_blocked_sources.join("|"),
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n"),
  );
  fs.writeFileSync(
    markdownOutputPath,
    buildMarkdownReport({
      generatedAt: summary.generated_at,
      records,
      configuredSources,
      promoSyncSources,
    }),
  );

  console.log(
    JSON.stringify(
      {
        json_output: jsonOutputPath,
        csv_output: csvOutputPath,
        markdown_output: markdownOutputPath,
        summary,
      },
      null,
      2,
    ),
  );
}

void main();
