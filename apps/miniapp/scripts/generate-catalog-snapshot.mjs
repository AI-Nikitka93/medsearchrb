import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@libsql/client";

const miniappRoot = process.cwd();
const repoRoot = path.resolve(miniappRoot, "..", "..");
const outputDir = path.join(miniappRoot, "public", "data");
const outputPath = path.join(outputDir, "catalog.json");
const overviewOutputPath = path.join(outputDir, "catalog-overview.json");
const envFiles = [path.join(repoRoot, ".env"), path.join(repoRoot, ".env.txt")];

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

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
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
    'BLOCKER: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing. Add them to ".env" or ".env.txt" at repo root before building the mini app.',
  );
  process.exit(1);
}

const client = createClient({ url, authToken });

const visibleDoctorsResult = await client.execute(`
  WITH latest_reviews AS (
    SELECT
      doctor_id,
      source_name,
      rating_avg,
      reviews_count,
      captured_at,
      ROW_NUMBER() OVER (
        PARTITION BY doctor_id, source_name
        ORDER BY captured_at DESC
      ) AS row_num
    FROM reviews_summary
    WHERE doctor_id IS NOT NULL
  ),
  aggregated_reviews AS (
    SELECT
      doctor_id,
      CASE
        WHEN SUM(CASE WHEN rating_avg IS NOT NULL AND reviews_count > 0 THEN reviews_count ELSE 0 END) > 0
          THEN ROUND(
            SUM(CASE WHEN rating_avg IS NOT NULL THEN rating_avg * reviews_count ELSE 0 END) * 1.0 /
            SUM(CASE WHEN rating_avg IS NOT NULL AND reviews_count > 0 THEN reviews_count ELSE 0 END),
            1
          )
        ELSE ROUND(MAX(CASE WHEN rating_avg IS NOT NULL AND reviews_count > 0 THEN rating_avg END), 1)
      END AS rating_avg,
      SUM(reviews_count) AS reviews_count
    FROM latest_reviews
    WHERE row_num = 1
    GROUP BY doctor_id
  )
  SELECT
    d.id,
    d.slug,
    d.full_name,
    d.description_short,
    ar.rating_avg,
    COALESCE(ar.reviews_count, 0) AS reviews_count
  FROM doctors d
  LEFT JOIN aggregated_reviews ar ON ar.doctor_id = d.id
  WHERE d.is_hidden = 0
    AND d.opt_out = 0
  ORDER BY COALESCE(ar.reviews_count, 0) DESC, d.full_name ASC
`);

const specialtiesResult = await client.execute(`
  SELECT
    ds.doctor_id,
    s.id,
    s.slug,
    s.name,
    ds.is_primary
  FROM doctor_specialties ds
  INNER JOIN specialties s ON s.id = ds.specialty_id
  INNER JOIN doctors d ON d.id = ds.doctor_id
  WHERE d.is_hidden = 0
    AND d.opt_out = 0
  ORDER BY ds.doctor_id ASC, ds.is_primary DESC, s.sort_order ASC, s.name ASC
`);

const clinicsResult = await client.execute(`
  SELECT
    dc.doctor_id,
    c.id AS clinic_id,
    c.slug AS clinic_slug,
    c.name AS clinic_name,
    c.address,
    c.site_url,
    COALESCE(dc.official_booking_url, dc.booking_url, dc.aggregator_booking_url) AS booking_url,
    COALESCE(dc.official_profile_url, dc.profile_url, dc.aggregator_profile_url) AS profile_url,
    dc.official_booking_url,
    dc.official_profile_url,
    dc.aggregator_booking_url,
    dc.aggregator_profile_url,
    dc.verification_status,
    dc.verified_on_clinic_site,
    dc.last_verified_at
  FROM doctor_clinics dc
  INNER JOIN clinics c ON c.id = dc.clinic_id
  INNER JOIN doctors d ON d.id = dc.doctor_id
  WHERE dc.is_active = 1
    AND c.is_hidden = 0
    AND c.opt_out = 0
    AND d.is_hidden = 0
    AND d.opt_out = 0
  ORDER BY dc.doctor_id ASC, c.name ASC
`);

const reviewsResult = await client.execute(`
  WITH ranked_reviews AS (
    SELECT
      r.doctor_id,
      r.source_name,
      r.source_page_url,
      r.rating_avg,
      r.reviews_count,
      r.captured_at,
      ROW_NUMBER() OVER (
        PARTITION BY r.doctor_id, r.source_name
        ORDER BY r.captured_at DESC
      ) AS row_num
    FROM reviews_summary r
    INNER JOIN doctors d ON d.id = r.doctor_id
    WHERE r.doctor_id IS NOT NULL
      AND d.is_hidden = 0
      AND d.opt_out = 0
  )
SELECT
  doctor_id,
  source_name,
  source_page_url,
  CASE
    WHEN reviews_count > 0 THEN rating_avg
    ELSE NULL
  END AS rating_avg,
  reviews_count,
  captured_at
FROM ranked_reviews
WHERE row_num = 1
ORDER BY doctor_id ASC, reviews_count DESC, source_name ASC
`);

const doctorPromotionsResult = await client.execute(`
  SELECT
    dc.doctor_id,
    p.id,
    p.title,
    p.source_url,
    p.ends_at,
    c.id AS clinic_id,
    c.slug AS clinic_slug,
    c.name AS clinic_name
  FROM doctor_clinics dc
  INNER JOIN promotions p ON p.clinic_id = dc.clinic_id
  INNER JOIN clinics c ON c.id = p.clinic_id
  INNER JOIN doctors d ON d.id = dc.doctor_id
  WHERE dc.is_active = 1
    AND p.is_active = 1
    AND p.is_hidden = 0
    AND c.is_hidden = 0
    AND c.opt_out = 0
    AND d.is_hidden = 0
    AND d.opt_out = 0
    AND (p.doctor_id = dc.doctor_id OR p.doctor_id IS NULL)
  ORDER BY dc.doctor_id ASC, COALESCE(p.ends_at, '9999-12-31T00:00:00Z') ASC, p.updated_at DESC
`);

const promotionsResult = await client.execute(`
  SELECT
    p.id,
    p.title,
    p.source_url,
    p.ends_at,
    c.id AS clinic_id,
    c.slug AS clinic_slug,
    c.name AS clinic_name,
    d.id AS doctor_id,
    d.slug AS doctor_slug,
    d.full_name AS doctor_name
  FROM promotions p
  INNER JOIN clinics c ON c.id = p.clinic_id
  LEFT JOIN doctors d ON d.id = p.doctor_id
  WHERE p.is_active = 1
    AND p.is_hidden = 0
    AND c.is_hidden = 0
    AND c.opt_out = 0
    AND (d.id IS NULL OR (d.is_hidden = 0 AND d.opt_out = 0))
  ORDER BY COALESCE(p.ends_at, '9999-12-31T00:00:00Z') ASC, p.updated_at DESC
`);

const specialtiesByDoctorId = new Map();
for (const row of specialtiesResult.rows) {
  const doctorId = String(row.doctor_id);
  const current = specialtiesByDoctorId.get(doctorId) ?? [];
  current.push({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    is_primary: Number(row.is_primary ?? 0) === 1,
  });
  specialtiesByDoctorId.set(doctorId, current);
}

const clinicsByDoctorId = new Map();
for (const row of clinicsResult.rows) {
  const doctorId = String(row.doctor_id);
  const current = clinicsByDoctorId.get(doctorId) ?? [];
  current.push({
    id: String(row.clinic_id),
    slug: String(row.clinic_slug),
    name: String(row.clinic_name),
    address: row.address ? String(row.address) : null,
    site_url: row.site_url ? String(row.site_url) : null,
    booking_url: row.booking_url ? String(row.booking_url) : null,
    profile_url: row.profile_url ? String(row.profile_url) : null,
    official_booking_url: row.official_booking_url
      ? String(row.official_booking_url)
      : null,
    official_profile_url: row.official_profile_url
      ? String(row.official_profile_url)
      : null,
    aggregator_booking_url: row.aggregator_booking_url
      ? String(row.aggregator_booking_url)
      : null,
    aggregator_profile_url: row.aggregator_profile_url
      ? String(row.aggregator_profile_url)
      : null,
    verification_status: row.verification_status
      ? String(row.verification_status)
      : "aggregator_only",
    verified_on_clinic_site: Number(row.verified_on_clinic_site ?? 0) === 1,
    last_verified_at: row.last_verified_at ? String(row.last_verified_at) : null,
  });
  clinicsByDoctorId.set(doctorId, current);
}

const reviewsByDoctorId = new Map();
for (const row of reviewsResult.rows) {
  const doctorId = String(row.doctor_id);
  const current = reviewsByDoctorId.get(doctorId) ?? [];
  current.push({
    source_name: String(row.source_name),
    source_page_url: String(row.source_page_url),
    rating_avg: row.rating_avg === null ? null : Number(row.rating_avg),
    reviews_count: Number(row.reviews_count ?? 0),
    captured_at: String(row.captured_at),
  });
  reviewsByDoctorId.set(doctorId, current);
}

const doctorPromotionsByDoctorId = new Map();
for (const row of doctorPromotionsResult.rows) {
  const doctorId = String(row.doctor_id);
  const current = doctorPromotionsByDoctorId.get(doctorId) ?? [];
  current.push({
    id: String(row.id),
    title: String(row.title),
    source_url: String(row.source_url),
    ends_at: row.ends_at ? String(row.ends_at) : null,
    clinic: {
      id: String(row.clinic_id),
      slug: String(row.clinic_slug),
      name: String(row.clinic_name),
    },
  });
  doctorPromotionsByDoctorId.set(doctorId, current);
}

const doctors = visibleDoctorsResult.rows.map((row) => {
  const doctorId = String(row.id);

  return {
    id: doctorId,
    slug: String(row.slug),
    full_name: String(row.full_name),
    description_short: row.description_short ? String(row.description_short) : null,
    rating_avg: row.rating_avg === null ? null : Number(row.rating_avg),
    reviews_count: Number(row.reviews_count ?? 0),
    specialties: specialtiesByDoctorId.get(doctorId) ?? [],
    clinics: clinicsByDoctorId.get(doctorId) ?? [],
    reviews: reviewsByDoctorId.get(doctorId) ?? [],
    promotions: doctorPromotionsByDoctorId.get(doctorId) ?? [],
  };
});

const promotions = promotionsResult.rows.map((row) => ({
  id: String(row.id),
  title: String(row.title),
  source_url: String(row.source_url),
  ends_at: row.ends_at ? String(row.ends_at) : null,
  clinic: {
    id: String(row.clinic_id),
    slug: String(row.clinic_slug),
    name: String(row.clinic_name),
  },
  doctor: row.doctor_id
    ? {
        id: String(row.doctor_id),
        slug: String(row.doctor_slug),
        full_name: String(row.doctor_name),
      }
    : null,
}));

const clinicIds = new Set();
const specialtyMap = new Map();

for (const doctor of doctors) {
  for (const clinic of doctor.clinics) {
    clinicIds.add(clinic.id);
  }

  for (const specialty of doctor.specialties) {
    const key = specialty.slug || specialty.name.trim().toLowerCase();
    const current = specialtyMap.get(key);
    if (current) {
      current.count += 1;
      continue;
    }

    specialtyMap.set(key, {
      slug: specialty.slug || key,
      name: specialty.name,
      count: 1,
    });
  }
}

const overviewPayload = {
  generated_at: new Date().toISOString(),
  doctors_total: doctors.length,
  promotions_total: promotions.length,
  clinics_total: clinicIds.size,
  specialties: Array.from(specialtyMap.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.name.localeCompare(right.name, "ru");
  }),
};

const payload = {
  generated_at: overviewPayload.generated_at,
  doctors,
  promotions,
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(payload));
fs.writeFileSync(overviewOutputPath, JSON.stringify(overviewPayload));

console.log(
  JSON.stringify({
    output: outputPath,
    overview_output: overviewOutputPath,
    doctors: doctors.length,
    promotions: promotions.length,
  }),
);
