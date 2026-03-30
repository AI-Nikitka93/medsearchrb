import type { Client } from "@libsql/client/web";

import {
  PromotionsReadRepository,
  type PromotionFilters,
} from "../repositories/promotions-read-repository";
import { isMinskClinicAddress } from "../utils/normalize";

export class PromotionsService {
  constructor(private readonly repo = new PromotionsReadRepository()) {}

  async list(client: Client, filters: PromotionFilters) {
    const result = await this.repo.list(client, filters);
    const items = result.rows
      .filter((row) =>
        isMinskClinicAddress(row.clinic_address ? String(row.clinic_address) : null),
      )
      .map((row) => ({
        id: String(row.id),
        title: String(row.title),
        source_url: String(row.source_url),
        ends_at: row.ends_at ? String(row.ends_at) : null,
        clinic: {
          id: String(row.clinic_id),
          slug: String(row.clinic_slug),
          name: String(row.clinic_name),
        },
        doctor:
          row.doctor_id === null
            ? null
            : {
                id: String(row.doctor_id),
                slug: String(row.doctor_slug),
                full_name: String(row.doctor_name),
              },
      }));

    return {
      total:
        items.length < result.rows.length
          ? Math.max(items.length, result.total - (result.rows.length - items.length))
          : result.total,
      page: filters.page,
      per_page: filters.perPage,
      items,
    };
  }
}
