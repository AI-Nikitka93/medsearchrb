import type { Client } from "@libsql/client/web";

import type { SqlExecutor } from "../lib/db";
import type { ChannelMessageReceipt } from "../services/telegram-bot-service";

export type PendingPromotionEvent = {
  id: string;
  entity_id: string;
  dedupe_key: string;
  payload_json: string;
  attempt_count: number;
};

export type PostedPromotionEvent = {
  outbox_id: string;
  promotion_id: string;
  title: string;
  description_short: string | null;
  source_url: string;
  ends_at: string | null;
  published_at: string | null;
  clinic_name: string;
  clinic_site_url: string | null;
  source_name: string;
  telegram_chat_id: string;
  telegram_message_id: number;
  is_active: number;
};

export type PostedPromotionDelivery = {
  outbox_id: string;
  chat_id: string;
  message_id: number;
};

export type PromotionChannelPayload = {
  promotion_id: string;
  title: string;
  description_short: string | null;
  source_url: string;
  ends_at: string | null;
  published_at: string | null;
  clinic_name: string;
  clinic_site_url: string | null;
  source_name: string;
};

export class NotificationOutboxRepository {
  private readonly staleProcessingWindowMs = 20 * 60 * 1000;

  async claimPendingPromotionEvents(
    client: Client,
    limit: number,
  ): Promise<PendingPromotionEvent[]> {
    const tx = await client.transaction("write");
    const staleBeforeIso = new Date(
      Date.now() - this.staleProcessingWindowMs,
    ).toISOString();
    const claimedAt = new Date().toISOString();
    const nowIso = claimedAt;

    try {
      const selected = await tx.execute({
        sql: `
          SELECT candidate.id, candidate.entity_id, candidate.dedupe_key,
                 candidate.payload_json, candidate.attempt_count
          FROM notification_outbox AS candidate
          WHERE candidate.event_type = 'promotion.updated'
            AND candidate.entity_type = 'promotion'
            AND (
              (
                candidate.status IN ('pending', 'failed')
                AND (candidate.next_attempt_at IS NULL OR candidate.next_attempt_at <= ?)
              )
              OR (
                candidate.status = 'processing'
                AND (
                  (candidate.claimed_at IS NOT NULL AND candidate.claimed_at <= ?)
                  OR (candidate.claimed_at IS NULL AND candidate.created_at <= ?)
                )
              )
            )
            AND NOT EXISTS (
              SELECT 1
              FROM notification_outbox AS busy
              WHERE busy.entity_id = candidate.entity_id
                AND busy.event_type = 'promotion.updated'
                AND busy.entity_type = 'promotion'
                AND busy.status = 'processing'
                AND busy.id <> candidate.id
            )
            AND NOT EXISTS (
              SELECT 1
              FROM notification_outbox AS earlier
              WHERE earlier.entity_id = candidate.entity_id
                AND earlier.event_type = 'promotion.updated'
                AND earlier.entity_type = 'promotion'
                AND earlier.id <> candidate.id
                AND (
                  earlier.created_at < candidate.created_at
                  OR (
                    earlier.created_at = candidate.created_at
                    AND earlier.id < candidate.id
                  )
                )
                AND (
                  (
                    earlier.status IN ('pending', 'failed')
                    AND (earlier.next_attempt_at IS NULL OR earlier.next_attempt_at <= ?)
                  )
                  OR (
                    earlier.status = 'processing'
                    AND (
                      (earlier.claimed_at IS NOT NULL AND earlier.claimed_at <= ?)
                      OR (earlier.claimed_at IS NULL AND earlier.created_at <= ?)
                    )
                  )
                )
            )
          ORDER BY candidate.created_at ASC
          LIMIT ?
        `,
        args: [
          nowIso,
          staleBeforeIso,
          staleBeforeIso,
          nowIso,
          staleBeforeIso,
          staleBeforeIso,
          limit,
        ],
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
                last_error = NULL,
                claimed_at = ?
            WHERE id = ?
          `,
          args: [claimedAt, row.id],
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
          p.description_short,
          p.source_url,
          p.ends_at,
          p.published_at,
          p.source_name,
          c.name AS clinic_name,
          c.site_url AS clinic_site_url
        FROM promotions p
        INNER JOIN clinics c ON c.id = p.clinic_id
        WHERE p.id = ?
          AND p.is_active = 1
          AND p.is_hidden = 0
          AND (p.ends_at IS NULL OR date(p.ends_at) >= date(?))
          AND p.title NOT LIKE '%АКЦИЯ ЗАВЕРШЕНА%'
          AND p.title NOT LIKE '%акция завершена%'
          AND p.title NOT LIKE '%АКЦИЯ ЗАВЕРШИЛАСЬ%'
          AND p.title NOT LIKE '%акция завершилась%'
          AND p.title NOT LIKE '%АКЦИЯ ОКОНЧЕНА%'
          AND p.title NOT LIKE '%акция окончена%'
          AND p.title NOT LIKE '%НЕ ДЕЙСТВУЕТ%'
          AND p.title NOT LIKE '%не действует%'
          AND c.is_hidden = 0
          AND c.opt_out = 0
        LIMIT 1
      `,
      args: [promotionId, new Date().toISOString()],
    });

    return ((result.rows[0] as unknown) as PromotionChannelPayload | undefined) ?? null;
  }

  async markSent(
    db: SqlExecutor,
    outboxId: string,
    sentAt: string,
    delivery: ChannelMessageReceipt,
  ) {
    await db.execute({
      sql: `
        UPDATE notification_outbox
        SET status = 'sent',
            sent_at = ?,
            last_error = NULL,
            claimed_at = NULL,
            next_attempt_at = NULL,
            channel_chat_id = ?,
            channel_message_id = ?,
            channel_last_checked_at = NULL
        WHERE id = ?
      `,
      args: [sentAt, delivery.chatId, delivery.messageId, outboxId],
    });
  }

  async markFailed(
    db: SqlExecutor,
    outboxId: string,
    errorMessage: string,
    attemptCount: number,
    retryDelayMs?: number,
  ) {
    const exponentialDelayMs = Math.min(
      5 * 2 ** Math.max(0, attemptCount - 1),
      24 * 60,
    ) * 60_000;
    const nextAttemptAt = new Date(
      Date.now() + Math.max(60_000, retryDelayMs ?? exponentialDelayMs),
    ).toISOString();

    await db.execute({
      sql: `
        UPDATE notification_outbox
        SET status = 'failed',
            last_error = ?,
            claimed_at = NULL,
            next_attempt_at = ?
        WHERE id = ?
      `,
      args: [errorMessage.slice(0, 500), nextAttemptAt, outboxId],
    });
  }

  async markDiscarded(db: SqlExecutor, outboxId: string, reason: string) {
    await db.execute({
      sql: `
        UPDATE notification_outbox
        SET status = 'discarded',
            last_error = ?,
            claimed_at = NULL,
            next_attempt_at = NULL
        WHERE id = ?
      `,
      args: [reason.slice(0, 500), outboxId],
    });
  }

  async markSuperseded(db: SqlExecutor, outboxId: string) {
    await db.execute({
      sql: `
        UPDATE notification_outbox
        SET status = 'superseded',
            last_error = NULL,
            claimed_at = NULL,
            next_attempt_at = NULL
        WHERE id = ?
      `,
      args: [outboxId],
    });
  }

  async getSentPromotionDelivery(
    db: SqlExecutor,
    promotionId: string,
  ): Promise<PostedPromotionDelivery | null> {
    const result = await db.execute({
      sql: `
        SELECT
          id AS outbox_id,
          channel_chat_id AS chat_id,
          channel_message_id AS message_id
        FROM notification_outbox
        WHERE event_type = 'promotion.updated'
          AND entity_type = 'promotion'
          AND entity_id = ?
          AND status = 'sent'
          AND channel_chat_id IS NOT NULL
          AND channel_message_id IS NOT NULL
        ORDER BY sent_at DESC, created_at DESC
        LIMIT 1
      `,
      args: [promotionId],
    });

    return (result.rows[0] as unknown as PostedPromotionDelivery | undefined) ?? null;
  }

  async listExpiredPostedPromotions(
    db: SqlExecutor,
    args: { nowIso: string; retryAfterIso: string; limit: number },
  ): Promise<PostedPromotionEvent[]> {
    const result = await db.execute({
      sql: `
        SELECT
          o.id AS outbox_id,
          p.id AS promotion_id,
          p.title,
          p.description_short,
          p.source_url,
          p.ends_at,
          p.published_at,
          p.source_name,
          c.name AS clinic_name,
          c.site_url AS clinic_site_url,
          o.channel_chat_id AS telegram_chat_id,
          o.channel_message_id AS telegram_message_id,
          p.is_active
        FROM notification_outbox o
        INNER JOIN promotions p ON p.id = o.entity_id
        INNER JOIN clinics c ON c.id = p.clinic_id
        WHERE o.event_type = 'promotion.updated'
          AND o.entity_type = 'promotion'
          AND o.status = 'sent'
          AND o.channel_chat_id IS NOT NULL
          AND o.channel_message_id IS NOT NULL
          AND p.ends_at IS NOT NULL
          AND date(p.ends_at) < date(?)
          AND (
            o.channel_last_checked_at IS NULL
            OR o.channel_last_checked_at <= ?
          )
        ORDER BY o.channel_last_checked_at ASC, o.created_at ASC
        LIMIT ?
      `,
      args: [args.nowIso, args.retryAfterIso, args.limit],
    });

    return result.rows as unknown as PostedPromotionEvent[];
  }

  async listPostedPromotionsForSourceCheck(
    db: SqlExecutor,
    args: { nowIso: string; checkedBeforeIso: string },
  ): Promise<PostedPromotionEvent | null> {
    const result = await db.execute({
      sql: `
        SELECT
          o.id AS outbox_id,
          p.id AS promotion_id,
          p.title,
          p.description_short,
          p.source_url,
          p.ends_at,
          p.published_at,
          p.source_name,
          c.name AS clinic_name,
          c.site_url AS clinic_site_url,
          o.channel_chat_id AS telegram_chat_id,
          o.channel_message_id AS telegram_message_id,
          p.is_active
        FROM notification_outbox o
        INNER JOIN promotions p ON p.id = o.entity_id
        INNER JOIN clinics c ON c.id = p.clinic_id
        WHERE o.event_type = 'promotion.updated'
          AND o.entity_type = 'promotion'
          AND o.status = 'sent'
          AND o.channel_chat_id IS NOT NULL
          AND o.channel_message_id IS NOT NULL
          AND (p.ends_at IS NULL OR date(p.ends_at) >= date(?))
          AND (
            o.channel_last_checked_at IS NULL
            OR o.channel_last_checked_at <= ?
          )
        ORDER BY o.channel_last_checked_at ASC, o.created_at ASC
        LIMIT 1
      `,
      args: [args.nowIso, args.checkedBeforeIso],
    });

    return (result.rows[0] as unknown as PostedPromotionEvent | undefined) ?? null;
  }

  async markPostedPromotionChecked(
    db: SqlExecutor,
    outboxId: string,
    checkedAt: string,
  ) {
    await db.execute({
      sql: `
        UPDATE notification_outbox
        SET channel_last_checked_at = ?
        WHERE id = ? AND status = 'sent'
      `,
      args: [checkedAt, outboxId],
    });
  }

  async deactivatePromotion(
    db: SqlExecutor,
    promotionId: string,
    updatedAt: string,
  ) {
    await db.execute({
      sql: `
        UPDATE promotions
        SET is_active = 0,
            updated_at = ?
        WHERE id = ?
      `,
      args: [updatedAt, promotionId],
    });
  }
}
