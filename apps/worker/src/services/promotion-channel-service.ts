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
  failureDetails: Array<{ title: string; reason: string }>;
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

type PromotionSourcePage = {
  ok: boolean;
  status: number;
  text: string;
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

function normalizeOfferEvidence(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;|&#160;|&#xA0;/giu, " ")
    .replace(/&amp;/giu, " ")
    .replace(/&quot;|&apos;|&#39;/giu, " ")
    .replace(/&(?:ndash|mdash);/giu, "-")
    .replace(/&#(x[\da-f]+|\d+);/giu, (_match, code: string) => {
      const value = code.toLowerCase().startsWith("x")
        ? Number.parseInt(code.slice(1), 16)
        : Number.parseInt(code, 10);
      return Number.isFinite(value) && value >= 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)
        ? String.fromCodePoint(value)
        : " ";
    })
    .toLocaleLowerCase("ru-BY")
    .replace(/ё/gu, "е")
    .replace(/[–—−]/gu, "-")
    .replace(/[^\p{L}\p{N}%]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function hasOfferEvidenceOnPage(pageHtml: string, title: string, description: string) {
  const page = normalizeOfferEvidence(pageHtml);
  const titleTokens = normalizeOfferEvidence(title)
    .split(" ")
    .filter((token) => token.length >= 4 || /\d/u.test(token));
  const numericTitleTokens = titleTokens.filter((token) => /\d/u.test(token));
  const descriptionTokens = normalizeOfferEvidence(description).split(" ");
  const detailTokens = descriptionTokens.filter(
    (token) =>
      token.length >= 6 &&
      !["скидка", "скидки", "акция", "акции", "действует", "предложение", "условия"].includes(token),
  );
  const numericTokens = descriptionTokens.filter((token) => /\d/u.test(token));
  const requiredTitleMatches = Math.min(3, titleTokens.length);
  const matchedTitleTokens = titleTokens.filter((token) => page.includes(token)).length;
  const requiredDetailMatches = Math.min(3, detailTokens.length);
  const matchedDetailTokens = detailTokens.filter((token) => page.includes(token)).length;

  return (
    titleTokens.length >= 2 &&
    matchedTitleTokens >= requiredTitleMatches &&
    numericTitleTokens.every((token) => page.includes(token)) &&
    requiredDetailMatches > 0 &&
    matchedDetailTokens >= requiredDetailMatches &&
    numericTokens.every((token) => page.includes(token))
  );
}

function isSameOfficialHost(sourceUrl: string, clinicSiteUrl: string | null) {
  if (!clinicSiteUrl) {
    return false;
  }

  try {
    const sourceHost = new URL(sourceUrl).hostname.toLocaleLowerCase("en-US").replace(/^www\./u, "");
    const clinicHost = new URL(clinicSiteUrl).hostname.toLocaleLowerCase("en-US").replace(/^www\./u, "");
    return sourceHost === clinicHost;
  } catch {
    return false;
  }
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
      failureDetails: [],
    };
    const sourcePagesByUrl = new Map<string, Promise<PromotionSourcePage>>();

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

        const hasCurrentDateEvidence = promotionHasCurrentDateEvidence({
          endsAt: payload.ends_at,
          publishedAt: payload.published_at,
        });
        const description = payload.description_short?.trim() ?? "";

        if (isGenericPromotionTitle(payload.title)) {
          await this.repo.markDiscarded(
            client,
            event.id,
            "Generic promotion title does not identify a concrete offer",
          );
          result.skipped += 1;
          continue;
        }

        if (
          description.length < 40 ||
          (!hasCurrentDateEvidence && description.length < 80)
        ) {
          await this.repo.markDiscarded(
            client,
            event.id,
            hasCurrentDateEvidence
              ? "Promotion has no detailed offer conditions for the channel"
              : "Undated promotion has no detailed offer conditions for the channel",
          );
          result.skipped += 1;
          continue;
        }

        const existingPost = await this.repo.getSentPromotionDelivery(
          client,
          payload.promotion_id,
        );

        let sourcePage = sourcePagesByUrl.get(payload.source_url);
        if (!sourcePage) {
          sourcePage = this.fetchPromotionSource(payload.source_url);
          sourcePagesByUrl.set(payload.source_url, sourcePage);
        }
        const recheck = await this.recheckPromotionSource(
          payload.source_url,
          payload.title,
          payload.ends_at,
          description,
          payload.clinic_site_url,
          env,
          payload.clinic_name,
          payload.source_name,
          sourcePage,
        );
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
          const reason = recheck.reason ?? "Promotion source could not be verified";
          await this.repo.markFailed(
            client,
            event.id,
            reason,
            event.attempt_count,
            6 * 60 * 60 * 1000,
          );
          result.failed += 1;
          result.failureDetails.push({ title: payload.title, reason });
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
        const reason = this.sanitizeDispatchError(error);
        await this.repo.markFailed(
          client,
          event.id,
          reason,
          event.attempt_count,
        );
        result.failed += 1;
        result.failureDetails.push({ title: "Promotion dispatch", reason });
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
        post.description_short ?? "",
        post.clinic_site_url,
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
    description: string,
    clinicSiteUrl: string | null,
    env: WorkerBindings,
    clinicName: string,
    sourceName: string,
    sourcePagePromise?: Promise<PromotionSourcePage>,
  ): Promise<PromotionSourceCheck> {
    if (!promotionIsActive({ title, endsAt })) {
      return {
        status: "ended",
        reason: "Promotion already marked inactive by title/date",
      };
    }

    const sourcePage = await (sourcePagePromise ?? this.fetchPromotionSource(sourceUrl));
    if (!sourcePage.ok) {
      return {
        status: "inconclusive",
        reason: `Promotion source returned HTTP ${sourcePage.status}; this does not confirm that it ended`,
      };
    }

    const pageText = sourcePage.text;
    if (promotionHasEndMarker(title, pageText)) {
      return {
        status: "ended",
        reason: "Promotion page contains ended marker",
      };
    }

    if (!hasOfferEvidenceOnPage(pageText, title, description)) {
      return {
        status: "inconclusive",
        reason: "The source page no longer confirms the offer title and conditions",
      };
    }

    if (
      !promotionHasCurrentDateEvidence({ endsAt, publishedAt: null }) &&
      !isSameOfficialHost(sourceUrl, clinicSiteUrl)
    ) {
      return {
        status: "inconclusive",
        reason: "An undated offer must be confirmed on the clinic's official site",
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

  private async fetchPromotionSource(sourceUrl: string): Promise<PromotionSourcePage> {
    const response = await fetch(sourceUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "MedsearchRB-Worker/1.0",
      },
    });

    return {
      ok: response.ok,
      status: response.status,
      text: response.ok ? (await response.text()).slice(0, 200_000) : "",
    };
  }

  private sanitizeDispatchError(error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown promotion dispatch error";
    return message
      .replace(/https:\/\/api\.telegram\.org\/bot[^/\s]+/giu, "https://api.telegram.org/bot[redacted]")
      .replace(/bot\d+:[A-Za-z0-9_-]+/gu, "bot[redacted]")
      .slice(0, 300);
  }
}
