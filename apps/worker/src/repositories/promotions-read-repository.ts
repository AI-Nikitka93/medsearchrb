import type { SqlExecutor } from "../lib/db";

export type PromotionFilters = {
  clinic?: string;
  page: number;
  perPage: number;
};

export class PromotionsReadRepository {
  async list(db: SqlExecutor, filters: PromotionFilters) {
    const whereClauses = [
      "p.is_active = 1",
      "p.is_hidden = 0",
      "c.is_hidden = 0",
      "c.opt_out = 0",
    ];
    const args: Array<string | number> = [];

    if (filters.clinic) {
      whereClauses.push("(c.slug = ? OR c.normalized_name = ?)");
      args.push(filters.clinic, filters.clinic);
    }

    const whereSql = whereClauses.join(" AND ");
    const offset = (filters.page - 1) * filters.perPage;

    const totalResult = await db.execute({
      sql: `
        SELECT COUNT(*) AS total
        FROM promotions p
        INNER JOIN clinics c ON c.id = p.clinic_id
        WHERE ${whereSql}
      `,
      args,
    });

    const rowsResult = await db.execute({
      sql: `
        SELECT
          p.id,
          p.title,
          p.source_url,
          p.ends_at,
          c.id AS clinic_id,
          c.slug AS clinic_slug,
          c.name AS clinic_name,
          c.address AS clinic_address,
          d.id AS doctor_id,
          d.slug AS doctor_slug,
          d.full_name AS doctor_name
        FROM promotions p
        INNER JOIN clinics c ON c.id = p.clinic_id
        LEFT JOIN doctors d ON d.id = p.doctor_id
        WHERE ${whereSql}
          AND (d.id IS NULL OR (d.is_hidden = 0 AND d.opt_out = 0))
        ORDER BY COALESCE(p.ends_at, '9999-12-31T00:00:00Z') ASC, p.updated_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [...args, filters.perPage, offset],
    });

    return {
      total: Number(totalResult.rows[0]?.total ?? 0),
      rows: rowsResult.rows,
    };
  }
}
