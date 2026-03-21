import type { SqlExecutor } from "../lib/db";

export type DoctorListFilters = {
  q?: string;
  specialty?: string;
  clinic?: string;
  page: number;
  perPage: number;
};

export class DoctorsReadRepository {
  async list(db: SqlExecutor, filters: DoctorListFilters) {
    const whereClauses = ["d.is_hidden = 0", "d.opt_out = 0"];
    const args: Array<string | number> = [];

    if (filters.q) {
      whereClauses.push(
        "(d.normalized_name LIKE ? OR s.normalized_name LIKE ? OR c.normalized_name LIKE ?)",
      );
      args.push(`%${filters.q}%`, `%${filters.q}%`, `%${filters.q}%`);
    }

    if (filters.specialty) {
      whereClauses.push("(s.slug = ? OR s.normalized_name = ?)");
      args.push(filters.specialty, filters.specialty);
    }

    if (filters.clinic) {
      whereClauses.push("(c.slug = ? OR c.normalized_name = ?)");
      args.push(filters.clinic, filters.clinic);
    }

    const whereSql = whereClauses.join(" AND ");
    const offset = (filters.page - 1) * filters.perPage;

    const totalResult = await db.execute({
      sql: `
        SELECT COUNT(DISTINCT d.id) AS total
        FROM doctors d
        LEFT JOIN doctor_specialties ds ON ds.doctor_id = d.id
        LEFT JOIN specialties s ON s.id = ds.specialty_id
        LEFT JOIN doctor_clinics dc ON dc.doctor_id = d.id AND dc.is_active = 1
        LEFT JOIN clinics c ON c.id = dc.clinic_id AND c.is_hidden = 0 AND c.opt_out = 0
        WHERE ${whereSql}
      `,
      args,
    });

    const result = await db.execute({
      sql: `
        SELECT
          d.id,
          d.slug,
          d.full_name,
          group_concat(DISTINCT s.name) AS specialties_csv,
          group_concat(DISTINCT c.name) AS clinics_csv,
          rs.rating_avg AS rating_avg,
          rs.reviews_count AS reviews_count,
          (
            SELECT p.title
            FROM promotions p
            INNER JOIN clinics promo_clinic
              ON promo_clinic.id = p.clinic_id
             AND promo_clinic.is_hidden = 0
             AND promo_clinic.opt_out = 0
            WHERE p.is_active = 1
              AND p.is_hidden = 0
              AND (p.doctor_id = d.id OR p.doctor_id IS NULL)
              AND EXISTS (
                SELECT 1
                FROM doctor_clinics promo_dc
                WHERE promo_dc.doctor_id = d.id
                  AND promo_dc.clinic_id = p.clinic_id
                  AND promo_dc.is_active = 1
              )
            ORDER BY COALESCE(p.ends_at, '9999-12-31T00:00:00Z') ASC, p.updated_at DESC
            LIMIT 1
          ) AS promo_title
        FROM doctors d
        LEFT JOIN doctor_specialties ds ON ds.doctor_id = d.id
        LEFT JOIN specialties s ON s.id = ds.specialty_id
        LEFT JOIN doctor_clinics dc ON dc.doctor_id = d.id AND dc.is_active = 1
        LEFT JOIN clinics c ON c.id = dc.clinic_id AND c.is_hidden = 0 AND c.opt_out = 0
        LEFT JOIN (
          SELECT r1.doctor_id, r1.rating_avg, r1.reviews_count
          FROM reviews_summary r1
          INNER JOIN (
            SELECT doctor_id, MAX(captured_at) AS max_captured_at
            FROM reviews_summary
            WHERE doctor_id IS NOT NULL
            GROUP BY doctor_id
          ) latest
            ON latest.doctor_id = r1.doctor_id
           AND latest.max_captured_at = r1.captured_at
        ) rs ON rs.doctor_id = d.id
        WHERE ${whereSql}
        GROUP BY d.id, d.slug, d.full_name, rs.rating_avg, rs.reviews_count
        ORDER BY COALESCE(rs.reviews_count, 0) DESC, d.full_name ASC
        LIMIT ? OFFSET ?
      `,
      args: [...args, filters.perPage, offset],
    });

    return {
      total: Number(totalResult.rows[0]?.total ?? 0),
      rows: result.rows,
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
          dc.booking_url,
          dc.profile_url
        FROM doctor_clinics dc
        INNER JOIN clinics c ON c.id = dc.clinic_id
        WHERE dc.doctor_id = ?
          AND dc.is_active = 1
          AND c.is_hidden = 0
          AND c.opt_out = 0
        ORDER BY c.name ASC
      `,
      args: [doctorId],
    });

    return result.rows;
  }

  async getReviews(db: SqlExecutor, doctorId: string) {
    const result = await db.execute({
      sql: `
        SELECT source_name, source_page_url, rating_avg, reviews_count, captured_at
        FROM reviews_summary
        WHERE doctor_id = ?
        ORDER BY captured_at DESC, source_name ASC
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
          c.name AS clinic_name
        FROM promotions p
        INNER JOIN clinics c ON c.id = p.clinic_id
        WHERE p.is_active = 1
          AND p.is_hidden = 0
          AND c.is_hidden = 0
          AND c.opt_out = 0
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
}
