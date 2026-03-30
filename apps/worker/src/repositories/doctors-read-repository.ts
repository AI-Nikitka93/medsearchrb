import type { SqlExecutor } from "../lib/db";
import {
  isExcludedCatalogQuery,
  isMedicalSpecialtyName,
  isMinskClinicAddress,
} from "../utils/normalize";

export type DoctorListFilters = {
  q?: string;
  specialty?: string;
  clinic?: string;
  page: number;
  perPage: number;
};

type DoctorRow = {
  id: string;
  slug: string;
  full_name: string;
  rating_avg: number | null;
  reviews_count: number;
  specialties_csv: string;
  clinics_csv: string;
  promo_title: string | null;
};

const NON_MEDICAL_SPECIALTY_SQL_PATTERNS = [
  "%парикмах%",
  "%барбер%",
  "%бровист%",
  "%визаж%",
  "%стилист%",
  "%мастер%",
  "%маникюр%",
  "%педикюр%",
  "%шугар%",
  "%депиляц%",
  "%эпиляц%",
  "%ресниц%",
  "%перманентн%",
  "%макияж%",
  "%косметик%",
  "%косметолог%",
  "%дерматокосмет%",
  "%массаж%",
  "%йог%",
  "%инструктор%",
  "%администратор%",
  "%медрегистратор%",
  "%нутрициолог%",
  "%подолог%",
  "%подиатр%",
  "%липокоррек%",
  "%пирсинг%",
  "%узкопрофильн%",
  "%специалист по%",
  "%уходу за телом%",
  "%грудному вскармливанию%",
  "%тренер%",
  "%преподавател%",
  "%воспитател%",
  "%спа%",
  "%тату%",
  "%ветеринар%",
];

const NON_MEDICAL_CLINIC_SQL_PATTERNS = [
  "%ветеринар%",
  "%ветцентр%",
  "%ветклиник%",
  "%ветмед%",
  "%ветмир%",
  "%доктор вет%",
  "%альфа-вет%",
  "%wellvet%",
  "%animal clinic%",
  "%энимал%",
  "%pets health%",
  "%zoohelp%",
  "%зооклиник%",
  "%зоовет%",
  "%девять жизней%",
  "%питомец%",
  "%главное хвост%",
  "%базылевск%",
  "%умная ветеринар%",
];

export class DoctorsReadRepository {
  async list(db: SqlExecutor, filters: DoctorListFilters) {
    const { whereSql, args } = this.buildListWhere(filters);
    const offset = (filters.page - 1) * filters.perPage;

    const totalResult = await db.execute({
      sql: `
        SELECT COUNT(*) AS total
        FROM doctors d
        WHERE ${whereSql}
      `,
      args,
    });

    const pageResult = await db.execute({
      sql: `
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
          ar.rating_avg AS rating_avg,
          COALESCE(ar.reviews_count, 0) AS reviews_count
        FROM doctors d
        LEFT JOIN aggregated_reviews ar ON ar.doctor_id = d.id
        WHERE ${whereSql}
        ORDER BY COALESCE(ar.reviews_count, 0) DESC, d.full_name ASC
        LIMIT ? OFFSET ?
      `,
      args: [...args, filters.perPage, offset],
    });

    const doctorIds = pageResult.rows.map((row) => String(row.id));
    if (doctorIds.length === 0) {
      return {
        total: Number(totalResult.rows[0]?.total ?? 0),
        rows: [] as DoctorRow[],
      };
    }

    const [specialtiesMap, clinicsMap, promotionsMap] = await Promise.all([
      this.getSpecialtiesCsv(db, doctorIds),
      this.getClinicsCsv(db, doctorIds),
      this.getPromoTitles(db, doctorIds),
    ]);

    return {
      total: Number(totalResult.rows[0]?.total ?? 0),
      rows: pageResult.rows.map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        full_name: String(row.full_name),
        rating_avg: row.rating_avg === null ? null : Number(row.rating_avg),
        reviews_count: Number(row.reviews_count ?? 0),
        specialties_csv: specialtiesMap.get(String(row.id)) ?? "",
        clinics_csv: clinicsMap.get(String(row.id)) ?? "",
        promo_title: promotionsMap.get(String(row.id)) ?? null,
      })),
    };
  }

  async getByIdOrSlug(db: SqlExecutor, doctorIdOrSlug: string) {
    const result = await db.execute({
      sql: `
        SELECT id, slug, full_name, description_short
        FROM doctors
        WHERE (id = ? OR slug = ?)
          AND is_hidden = 0
          AND opt_out = 0
          AND ${this.medicalSpecialtyExistsClause("doctors")}
        LIMIT 1
      `,
      args: [doctorIdOrSlug, doctorIdOrSlug],
    });

    return result.rows[0] ?? null;
  }

  async getSpecialties(db: SqlExecutor, doctorId: string) {
    const result = await db.execute({
      sql: `
        SELECT s.id, s.slug, s.name, ds.is_primary
        FROM doctor_specialties ds
        INNER JOIN specialties s ON s.id = ds.specialty_id
        WHERE ds.doctor_id = ?
          AND ${this.medicalSpecialtySqlClause("s")}
        ORDER BY ds.is_primary DESC, s.sort_order ASC, s.name ASC
      `,
      args: [doctorId],
    });

    return result.rows;
  }

  async getClinics(db: SqlExecutor, doctorId: string) {
    const result = await db.execute({
      sql: `
        SELECT
          dc.id,
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
        WHERE dc.doctor_id = ?
          AND dc.is_active = 1
          AND c.is_hidden = 0
          AND c.opt_out = 0
          AND ${this.medicalClinicSqlClause("c")}
        ORDER BY c.name ASC
      `,
      args: [doctorId],
    });

    return result.rows;
  }

  async getReviews(db: SqlExecutor, doctorId: string) {
    const result = await db.execute({
      sql: `
        WITH ranked_reviews AS (
          SELECT
            source_name,
            source_page_url,
            rating_avg,
            reviews_count,
            captured_at,
            ROW_NUMBER() OVER (
              PARTITION BY source_name
              ORDER BY captured_at DESC
            ) AS row_num
          FROM reviews_summary
          WHERE doctor_id = ?
        )
        SELECT
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
        ORDER BY reviews_count DESC, source_name ASC
      `,
      args: [doctorId],
    });

    return result.rows;
  }

  async getPromotions(db: SqlExecutor, doctorId: string) {
    const result = await db.execute({
      sql: `
        SELECT
          p.id,
          p.title,
          p.source_url,
          p.ends_at,
          c.id AS clinic_id,
          c.slug AS clinic_slug,
          c.name AS clinic_name,
          c.address AS clinic_address
        FROM promotions p
        INNER JOIN clinics c ON c.id = p.clinic_id
        WHERE p.is_active = 1
          AND p.is_hidden = 0
          AND c.is_hidden = 0
          AND c.opt_out = 0
          AND ${this.medicalClinicSqlClause("c")}
          AND (p.doctor_id = ? OR p.doctor_id IS NULL)
          AND EXISTS (
            SELECT 1
            FROM doctor_clinics dc
            WHERE dc.doctor_id = ?
              AND dc.clinic_id = p.clinic_id
              AND dc.is_active = 1
          )
        ORDER BY COALESCE(p.ends_at, '9999-12-31T00:00:00Z') ASC, p.created_at DESC
      `,
      args: [doctorId, doctorId],
    });

    return result.rows;
  }

  private buildListWhere(filters: DoctorListFilters) {
    const whereClauses = [
      "d.is_hidden = 0",
      "d.opt_out = 0",
      this.medicalSpecialtyExistsClause("d"),
    ];
    const args: Array<string | number> = [];

    if (filters.q) {
      const includeClinicQuery = !isExcludedCatalogQuery(filters.q);
      const queryConditions = [
        `
          d.normalized_name LIKE ?
        `,
        `
          EXISTS (
            SELECT 1
            FROM doctor_specialties ds_q
            INNER JOIN specialties s_q ON s_q.id = ds_q.specialty_id
            WHERE ds_q.doctor_id = d.id
              AND s_q.normalized_name LIKE ?
          )
        `,
      ];

      if (includeClinicQuery) {
        queryConditions.push(`
          EXISTS (
            SELECT 1
            FROM doctor_clinics dc_q
            INNER JOIN clinics c_q ON c_q.id = dc_q.clinic_id
            WHERE dc_q.doctor_id = d.id
              AND dc_q.is_active = 1
              AND c_q.is_hidden = 0
              AND c_q.opt_out = 0
              AND ${this.medicalClinicSqlClause("c_q")}
              AND c_q.normalized_name LIKE ?
          )
        `);
      }

      whereClauses.push(`
        (
          ${queryConditions.join("\n          OR ")}
        )
      `);
      args.push(`%${filters.q}%`, `%${filters.q}%`);
      if (includeClinicQuery) {
        args.push(`%${filters.q}%`);
      }
    }

    if (filters.specialty) {
      whereClauses.push(`
        EXISTS (
          SELECT 1
          FROM doctor_specialties ds_s
          INNER JOIN specialties s_s ON s_s.id = ds_s.specialty_id
          WHERE ds_s.doctor_id = d.id
            AND (s_s.slug = ? OR s_s.normalized_name = ?)
        )
      `);
      args.push(filters.specialty, filters.specialty);
    }

    if (filters.clinic) {
      whereClauses.push(`
        EXISTS (
          SELECT 1
          FROM doctor_clinics dc_c
          INNER JOIN clinics c_c ON c_c.id = dc_c.clinic_id
          WHERE dc_c.doctor_id = d.id
            AND dc_c.is_active = 1
            AND c_c.is_hidden = 0
            AND c_c.opt_out = 0
            AND ${this.medicalClinicSqlClause("c_c")}
            AND (c_c.slug = ? OR c_c.normalized_name = ?)
        )
      `);
      args.push(filters.clinic, filters.clinic);
    }

    return {
      whereSql: whereClauses.join(" AND "),
      args,
    };
  }

  private async getSpecialtiesCsv(db: SqlExecutor, doctorIds: string[]) {
    const result = await db.execute({
      sql: `
        SELECT ds.doctor_id, s.name, ds.is_primary, s.sort_order
        FROM doctor_specialties ds
        INNER JOIN specialties s ON s.id = ds.specialty_id
        WHERE ds.doctor_id IN (${this.placeholders(doctorIds.length)})
          AND ${this.medicalSpecialtySqlClause("s")}
        ORDER BY ds.doctor_id ASC, ds.is_primary DESC, s.sort_order ASC, s.name ASC
      `,
      args: doctorIds,
    });

    const grouped = new Map<string, string[]>();
    for (const row of result.rows) {
      const doctorId = String(row.doctor_id);
      const names = grouped.get(doctorId) ?? [];
      const specialtyName = String(row.name);
      if (isMedicalSpecialtyName(specialtyName) && !names.includes(specialtyName)) {
        names.push(specialtyName);
      }
      grouped.set(doctorId, names);
    }

    return new Map(
      Array.from(grouped.entries(), ([doctorId, names]) => [doctorId, names.join(",")]),
    );
  }

  private async getClinicsCsv(db: SqlExecutor, doctorIds: string[]) {
    const result = await db.execute({
      sql: `
        SELECT dc.doctor_id, c.name, c.address
        FROM doctor_clinics dc
        INNER JOIN clinics c ON c.id = dc.clinic_id
        WHERE dc.doctor_id IN (${this.placeholders(doctorIds.length)})
          AND dc.is_active = 1
          AND c.is_hidden = 0
          AND c.opt_out = 0
          AND ${this.medicalClinicSqlClause("c")}
        ORDER BY dc.doctor_id ASC, c.name ASC
      `,
      args: doctorIds,
    });

    const grouped = new Map<string, string[]>();
    for (const row of result.rows) {
      const doctorId = String(row.doctor_id);
      const clinics = grouped.get(doctorId) ?? [];
      const clinicName = String(row.name);
      if (
        isMinskClinicAddress(row.address ? String(row.address) : null) &&
        !clinics.includes(clinicName)
      ) {
        clinics.push(clinicName);
      }
      grouped.set(doctorId, clinics);
    }

    return new Map(
      Array.from(grouped.entries(), ([doctorId, clinics]) => [doctorId, clinics.join(",")]),
    );
  }

  private async getPromoTitles(db: SqlExecutor, doctorIds: string[]) {
    const result = await db.execute({
      sql: `
        SELECT dc.doctor_id, p.title, p.ends_at, p.updated_at, c.address
        FROM doctor_clinics dc
        INNER JOIN promotions p ON p.clinic_id = dc.clinic_id
        INNER JOIN clinics c ON c.id = p.clinic_id
        WHERE dc.doctor_id IN (${this.placeholders(doctorIds.length)})
          AND dc.is_active = 1
          AND p.is_active = 1
          AND p.is_hidden = 0
          AND c.is_hidden = 0
          AND c.opt_out = 0
          AND ${this.medicalClinicSqlClause("c")}
          AND (p.doctor_id = dc.doctor_id OR p.doctor_id IS NULL)
        ORDER BY dc.doctor_id ASC, COALESCE(p.ends_at, '9999-12-31T00:00:00Z') ASC, p.updated_at DESC
      `,
      args: doctorIds,
    });

    const promotions = new Map<string, string>();
    for (const row of result.rows) {
      const doctorId = String(row.doctor_id);
      if (
        isMinskClinicAddress(row.address ? String(row.address) : null) &&
        !promotions.has(doctorId)
      ) {
        promotions.set(doctorId, String(row.title));
      }
    }

    return promotions;
  }

  private placeholders(count: number) {
    return Array.from({ length: count }, () => "?").join(", ");
  }

  private medicalSpecialtyExistsClause(doctorTableAlias: string) {
    return `
      EXISTS (
        SELECT 1
        FROM doctor_specialties ds_guard
        INNER JOIN specialties s_guard ON s_guard.id = ds_guard.specialty_id
        WHERE ds_guard.doctor_id = ${doctorTableAlias}.id
          AND ${this.medicalSpecialtySqlClause("s_guard")}
      )
    `;
  }

  private medicalSpecialtySqlClause(specialtyTableAlias: string) {
    const normalizedName = `COALESCE(${specialtyTableAlias}.normalized_name, LOWER(${specialtyTableAlias}.name), '')`;

    return [
      `${normalizedName} <> ''`,
      ...NON_MEDICAL_SPECIALTY_SQL_PATTERNS.map(
        (pattern) => `${normalizedName} NOT LIKE '${pattern}'`,
      ),
    ].join(" AND ");
  }

  private medicalClinicSqlClause(clinicTableAlias: string) {
    const normalizedName = `COALESCE(${clinicTableAlias}.normalized_name, LOWER(${clinicTableAlias}.name), '')`;

    return [
      `${normalizedName} <> ''`,
      ...NON_MEDICAL_CLINIC_SQL_PATTERNS.map(
        (pattern) => `${normalizedName} NOT LIKE '${pattern}'`,
      ),
    ].join(" AND ");
  }
}
