import type { Client } from "@libsql/client/web";

import type { WorkerBindings } from "../env";
import { ensureDbReady } from "../lib/db";
import { NotificationOutboxRepository } from "../repositories/notification-outbox-repository";
import { TelegramBotService } from "./telegram-bot-service";
import {
  promotionHasCurrentDateEvidence,
  promotionHasEndMarker,
  promotionIsActive,
} from "../utils/promotion-status";
import { PromotionAiService } from "./promotion-ai-service";

export type PromotionDispatchResult = {
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
};

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
      failed: 0,
      skipped: 0,
    };

    for (const event of events) {
      try {
        const payload = await this.repo.getPromotionChannelPayload(client, event.entity_id);
        if (!payload) {
          await this.repo.markFailed(
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
          await this.repo.markFailed(
            client,
            event.id,
            "Promotion has no current published/expiry date evidence for channel",
          );
          result.skipped += 1;
          continue;
        }

        const recheck = await this.recheckPromotionSource(
          payload.source_url,
          payload.title,
          payload.ends_at,
          env,
          payload.clinic_name,
          payload.source_name,
        );
        if (!recheck.isActive) {
          await this.repo.deactivatePromotion(client, payload.promotion_id, new Date().toISOString());
          await this.repo.markFailed(
            client,
            event.id,
            recheck.reason ?? "Promotion no longer active after live recheck",
          );
          result.skipped += 1;
          continue;
        }

        await telegram.sendPromotionToChannel({
          title: payload.title,
          clinicName: payload.clinic_name,
          sourceName: payload.source_name,
          sourceUrl: payload.source_url,
          clinicSiteUrl: payload.clinic_site_url,
          endsAt: payload.ends_at,
        });

        await this.repo.markSent(client, event.id, new Date().toISOString());
        result.sent += 1;
      } catch (error) {
        await this.repo.markFailed(
          client,
          event.id,
          error instanceof Error ? error.message : "Unknown promotion dispatch error",
        );
        result.failed += 1;
      }
    }

    return result;
  }

  private async recheckPromotionSource(
    sourceUrl: string,
    title: string,
    endsAt: string | null,
    env: WorkerBindings,
    clinicName: string,
    sourceName: string,
  ): Promise<{ isActive: boolean; reason?: string }> {
    if (!promotionIsActive({ title, endsAt })) {
      return {
        isActive: false,
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
        isActive: false,
        reason: `Promotion source returned HTTP ${response.status}`,
      };
    }

    const pageText = (await response.text()).slice(0, 200_000);
    if (promotionHasEndMarker(title, pageText)) {
      return {
        isActive: false,
        reason: "Promotion page contains ended marker",
      };
    }

    if (this.promotionAi.isAvailable(env)) {
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
            isActive: false,
            reason: `Workers AI audit: ${aiAudit.reason}`,
          };
        }
      } catch (error) {
        console.error("promotion_ai_audit_error", error);
      }
    }

    return { isActive: true };
  }
}
