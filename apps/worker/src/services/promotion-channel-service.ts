import type { Client } from "@libsql/client/web";

import type { WorkerBindings } from "../env";
import { ensureDbReady } from "../lib/db";
import { NotificationOutboxRepository } from "../repositories/notification-outbox-repository";
import { TelegramBotService } from "./telegram-bot-service";

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
}
