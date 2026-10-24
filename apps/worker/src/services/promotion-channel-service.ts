import type { Client } from "@libsql/client/web";

import type { WorkerBindings } from "../env";
import { ensureDbReady } from "../lib/db";
import {
  NotificationOutboxRepository,
  type PostedPromotionEvent,
} from "../repositories/notification-outbox-repository";
import { TelegramBotService } from "./telegram-bot-service";
import {
  promotionHasCurrentDateEvidence,
  promotionHasEndMarker,
  promotionIsExpired,
  promotionIsActive,
} from "../utils/promotion-status";
import { PromotionAiService } from "./promotion-ai-service";

export type PromotionDispatchResult = {
  claimed: number;
  sent: number;
  edited: number;
  failed: number;
  skipped: number;
};

export type PostedPromotionAuditResult = {
  date_expired: number;
  source_checked: number;
  edited: number;
  failed: number;
};

type PromotionSourceCheck = {
  status: "active" | "ended" | "inconclusive";
  reason?: string;
};

function isGenericPromotionTitle(title: string) {
  const normalized = title
    .toLocaleLowerCase("ru")
    .replace(/[«»“”"]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return /^(?:(?:скидки?\s+и\s+)?акции|скидки|(?:специальные\s+)?предложения)(?:\s+месяца)?$/.test(
    normalized,
  );
}

export class PromotionChannelService {
  constructor(
    private readonly repo = new NotificationOutboxRepository(),
    private readonly batchLimit = 10,
    private readonly promotionAi = new PromotionAiService(),
  ) {}

  async dispatchPending(env: WorkerBindings): Promise<PromotionDispatchResult> {
    const client = await ensureDbReady(env);
    return this.dispatchPendingWithClient(client, env);
  }

  async dispatchPendingWithClient(
    client: Client,
    env: WorkerBindings,
  ): Promise<PromotionDispatchResult> {
    const events = await this.repo.claimPendingPromotionEvents(client, this.batchLimit);
    const telegram = new TelegramBotService(env);

    const result: PromotionDispatchResult = {
      claimed: events.length,
      sent: 0,
      edited: 0,
      failed: 0,
      skipped: 0,
    };
    const sourceChecksByUrl = new Map<string, Promise<PromotionSourceCheck>>();

    for (const event of events) {
      try {
        const payload = await this.repo.getPromotionChannelPayload(client, event.entity_id);
        if (!payload) {
          await this.repo.markDiscarded(
            client,
            event.id,
            "Promotion payload not found or hidden",
          );
          result.skipped += 1;
          continue;
        }

        if (
          !promotionHasCurrentDateEvidence({
            endsAt: payload.ends_at,
            publishedAt: payload.published_at,
          })
        ) {
          await this.repo.markDiscarded(
            client,
            event.id,
            "Promotion has no current published/expiry date evidence for channel",
          );
          result.skipped += 1;
          continue;
        }

        if (
          isGenericPromotionTitle(payload.title) &&
          !payload.description_short?.trim()
        ) {
          await this.repo.markFailed(
            client,
            event.id,
            "Generic promotion title has no offer details; waiting for a richer source record",
            event.attempt_count,
            24 * 60 * 60 * 1000,
          );
          result.skipped += 1;
          continue;
        }

        const existingPost = await this.repo.getSentPromotionDelivery(
          client,
          payload.promotion_id,
        );

        let sourceCheck = sourceChecksByUrl.get(payload.source_url);
        if (!sourceCheck) {
          sourceCheck = this.recheckPromotionSource(
            payload.source_url,
            payload.title,
            payload.ends_at,
            env,
            payload.clinic_name,
            payload.source_name,
          );
          sourceChecksByUrl.set(payload.source_url, sourceCheck);
        }
        const recheck = await sourceCheck;
        if (recheck.status === "ended") {
          if (existingPost) {
            await telegram.editPromotionToEnded({
              chatId: existingPost.chat_id,
              messageId: Number(existingPost.message_id),
              title: payload.title,
              description: payload.description_short,
              clinicName: payload.clinic_name,
              sourceName: payload.source_name,
              sourceUrl: payload.source_url,
              clinicSiteUrl: payload.clinic_site_url,
              endsAt: payload.ends_at,
            });
            await this.repo.markPostedPromotionChecked(
              client,
              existingPost.outbox_id,
              new Date().toISOString(),
            );
          }
          await this.repo.deactivatePromotion(client, payload.promotion_id, new Date().toISOString());
          await this.repo.markDiscarded(
            client,
            event.id,
            recheck.reason ?? "Promotion was confirmed ended by its source",
          );
          result.skipped += 1;
          continue;
        }

        if (recheck.status === "inconclusive") {
          await this.repo.markFailed(
            client,
            event.id,
            recheck.reason ?? "Promotion source could not be verified",
            event.attempt_count,
            6 * 60 * 60 * 1000,
          );
          result.failed += 1;
          continue;
        }

        const message = {
          title: payload.title,
          description: payload.description_short,
          clinicName: payload.clinic_name,
          sourceName: payload.source_name,
          sourceUrl: payload.source_url,
          clinicSiteUrl: payload.clinic_site_url,
          endsAt: payload.ends_at,
        };

        if (existingPost) {
          await telegram.editPromotionInChannel({
            ...message,
            chatId: existingPost.chat_id,
            messageId: Number(existingPost.message_id),
          });
          await this.repo.markPostedPromotionChecked(
            client,
            existingPost.outbox_id,
            new Date().toISOString(),
          );
          await this.repo.markSuperseded(client, event.id);
          result.edited += 1;
          continue;
        }

        const receipt = await telegram.sendPromotionToChannel(message);

        await this.repo.markSent(
          client,
          event.id,
          new Date().toISOString(),
          receipt,
        );
        result.sent += 1;
      } catch (error) {
        await this.repo.markFailed(
          client,
          event.id,
          error instanceof Error ? error.message : "Unknown promotion dispatch error",
          event.attempt_count,
        );
        result.failed += 1;
      }
    }

    return result;
  }

  async auditPostedPromotions(env: WorkerBindings): Promise<PostedPromotionAuditResult> {
    const client = await ensureDbReady(env);
    return this.auditPostedPromotionsWithClient(client, env);
  }

  async auditPostedPromotionsWithClient(
    client: Client,
    env: WorkerBindings,
  ): Promise<PostedPromotionAuditResult> {
    const now = new Date();
    const nowIso = now.toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const telegram = new TelegramBotService(env);
    const result: PostedPromotionAuditResult = {
      date_expired: 0,
      source_checked: 0,
      edited: 0,
      failed: 0,
    };

    const expiredPosts = await this.repo.listExpiredPostedPromotions(client, {
      nowIso,
      retryAfterIso: oneDayAgo,
      limit: 10,
    });

    for (const post of expiredPosts) {
      result.date_expired += 1;
      try {
        await this.editEndedPost(client, telegram, post, nowIso);
        result.edited += 1;
      } catch (error) {
        console.error("promotion_channel_expired_post_edit_error", {
          outboxId: post.outbox_id,
          error: error instanceof Error ? error.message : "Unknown edit error",
        });
        result.failed += 1;
      }
    }

    const post = await this.repo.listPostedPromotionsForSourceCheck(client, {
      nowIso,
      checkedBeforeIso: thirtyDaysAgo,
    });

    if (!post) {
      return result;
    }

    result.source_checked += 1;
    let check: PromotionSourceCheck;
    try {
      check = await this.recheckPromotionSource(
        post.source_url,
        post.title,
        post.ends_at,
        env,
        post.clinic_name,
        post.source_name,
      );
    } catch (error) {
      await this.repo.markPostedPromotionChecked(client, post.outbox_id, nowIso);
      console.error("promotion_channel_post_audit_error", {
        outboxId: post.outbox_id,
        error: error instanceof Error ? error.message : "Unknown source check error",
      });
      result.failed += 1;
      return result;
    }

    if (check.status === "ended") {
      try {
        await this.editEndedPost(client, telegram, post, nowIso);
        result.edited += 1;
      } catch (error) {
        console.error("promotion_channel_post_edit_error", {
          outboxId: post.outbox_id,
          error: error instanceof Error ? error.message : "Unknown edit error",
        });
        result.failed += 1;
        return result;
      }
    } else {
      // A failed or inconclusive page check must not deactivate an active listing.
      await this.repo.markPostedPromotionChecked(client, post.outbox_id, nowIso);
      if (check.status === "inconclusive") {
        result.failed += 1;
      }
    }

    return result;
  }

  private async editEndedPost(
    client: Client,
    telegram: TelegramBotService,
    post: PostedPromotionEvent,
    nowIso: string,
  ) {
    await telegram.editPromotionToEnded({
      chatId: post.telegram_chat_id,
      messageId: Number(post.telegram_message_id),
      title: post.title,
      clinicName: post.clinic_name,
      sourceName: post.source_name,
      description: post.description_short,
      sourceUrl: post.source_url,
      clinicSiteUrl: post.clinic_site_url,
      endsAt: post.ends_at,
    });
    await this.repo.deactivatePromotion(client, post.promotion_id, nowIso);
    await this.repo.markPostedPromotionChecked(client, post.outbox_id, nowIso);
  }

  private async recheckPromotionSource(
    sourceUrl: string,
    title: string,
    endsAt: string | null,
    env: WorkerBindings,
    clinicName: string,
    sourceName: string,
  ): Promise<PromotionSourceCheck> {
    if (!promotionIsActive({ title, endsAt })) {
      return {
        status: "ended",
        reason: "Promotion already marked inactive by title/date",
      };
    }

    const response = await fetch(sourceUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "MedsearchRB-Worker/1.0",
      },
    });

    if (!response.ok) {
      return {
        status: "inconclusive",
        reason: `Promotion source returned HTTP ${response.status}; this does not confirm that it ended`,
      };
    }

    const pageText = (await response.text()).slice(0, 200_000);
    if (promotionHasEndMarker(title, pageText)) {
      return {
        status: "ended",
        reason: "Promotion page contains ended marker",
      };
    }

    if (!endsAt && this.promotionAi.isAvailable(env)) {
      try {
        const aiAudit = await this.promotionAi.auditPromotion(env, {
          title,
          clinicName,
          sourceName,
          sourceUrl,
          endsAt,
          pageText,
        });

        if (aiAudit.status === "ended" && aiAudit.confidence >= 0.85) {
          return {
            status: "ended",
            reason: `Workers AI audit: ${aiAudit.reason}`,
          };
        }
      } catch (error) {
        console.error("promotion_ai_audit_error", error);
      }
    }

    return { status: "active" };
  }
}
