import type { Client } from "@libsql/client/web";

import type { SqlExecutor } from "../lib/db";

export type PendingPromotionEvent = {
  id: string;
  entity_id: string;
  dedupe_key: string;
  payload_json: string;
  attempt_count: number;
};

export type PromotionChannelPayload = {
  promotion_id: string;
  title: string;
  source_url: string;
  ends_at: string | null;
  clinic_name: string;
  clinic_site_url: string | null;
  source_name: string;
};

export class NotificationOutboxRepository {
  async claimPendingPromotionEvents(
    client: Client,
    limit: number,
  ): Promise<PendingPromotionEvent[]> {
    const tx = await client.transaction("write");

    try {
      const selected = await tx.execute({
        sql: `
          SELECT id, entity_id, dedupe_key, payload_json, attempt_count
          FROM notification_outbox
          WHERE event_type = 'promotion.updated'
            AND entity_type = 'promotion'
            AND status IN ('pending', 'failed')
            AND attempt_count < 5
          ORDER BY created_at ASC
          LIMIT ?
        `,
        args: [limit],
      });

      const rows = selected.rows as unknown as PendingPromotionEvent[];
      if (rows.length === 0) {
        await tx.commit();
        return [];
      }

      for (const row of rows) {
        await tx.execute({
          sql: `
            UPDATE notification_outbox
            SET status = 'processing',
                attempt_count = attempt_count + 1,
                last_error = NULL
            WHERE id = ?
          `,
          args: [row.id],
        });
      }

      await tx.commit();
      return rows.map((row) => ({
        ...row,
        attempt_count: Number(row.attempt_count ?? 0) + 1,
      }));
    } catch (error) {
      await tx.rollback().catch(() => undefined);
      throw error;
    }
  }

  async getPromotionChannelPayload(
    db: SqlExecutor,
    promotionId: string,
  ): Promise<PromotionChannelPayload | null> {
    const result = await db.execute({
      sql: `
        SELECT
          p.id AS promotion_id,
          p.title,
          p.source_url,
          p.ends_at,
          p.source_name,
          c.name AS clinic_name,
          c.site_url AS clinic_site_url
        FROM promotions p
        INNER JOIN clinics c ON c.id = p.clinic_id
        WHERE p.id = ?
          AND p.is_active = 1
          AND p.is_hidden = 0
          AND c.is_hidden = 0
          AND c.opt_out = 0
        LIMIT 1
      `,
      args: [promotionId],
    });

    return ((result.rows[0] as unknown) as PromotionChannelPayload | undefined) ?? null;
  }

  async markSent(db: SqlExecutor, outboxId: string, sentAt: string) {
    await db.execute({
      sql: `
        UPDATE notification_outbox
        SET status = 'sent',
            sent_at = ?,
            last_error = NULL
        WHERE id = ?
      `,
      args: [sentAt, outboxId],
    });
  }

  async markFailed(db: SqlExecutor, outboxId: string, errorMessage: string) {
    await db.execute({
      sql: `
        UPDATE notification_outbox
        SET status = 'failed',
            last_error = ?
        WHERE id = ?
      `,
      args: [errorMessage.slice(0, 500), outboxId],
    });
  }
}
