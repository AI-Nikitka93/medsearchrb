import { Hono } from "hono";
import { z } from "zod";

import type { WorkerBindings } from "../env";
import { errorJson } from "../utils/http";
import { TelegramBotService } from "../services/telegram-bot-service";

const telegram = new Hono<{ Bindings: WorkerBindings }>();

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

const updateSchema = z.object({
  message: z
    .object({
      text: z.string().optional(),
      chat: z.object({
        id: z.number(),
      }),
    })
    .optional(),
  callback_query: z
    .object({
      id: z.string(),
      data: z.string().optional(),
      message: z
        .object({
          chat: z.object({
            id: z.number(),
          }),
        })
        .optional(),
    })
    .optional(),
});

telegram.get("/health", (c) =>
  c.json({
    ok: true,
    runtime: "cloudflare-worker-webhook",
    webhook_secret_configured: Boolean(
      c.env.TELEGRAM_WEBHOOK_SECRET?.trim() || c.env.INGEST_SHARED_SECRET?.trim(),
    ),
  }),
);

telegram.post("/webhook", async (c) => {
  const bot = new TelegramBotService(c.env);
  const providedSecret = c.req.header("x-telegram-bot-api-secret-token");
  const expectedSecret = bot.webhookSecret()?.trim();

  if (!expectedSecret) {
    return errorJson(c, 503, "WEBHOOK_SECRET_MISSING", "telegram webhook secret is not configured", false);
  }

  if (!providedSecret || !constantTimeEqual(providedSecret, expectedSecret)) {
    return errorJson(c, 401, "UNAUTHORIZED", "telegram webhook secret is invalid", false);
  }

  const payload = await c.req.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);

  if (!parsed.success) {
    return errorJson(c, 400, "INVALID_UPDATE", parsed.error.message, false);
  }

  await bot.handleUpdate(parsed.data);
  return c.json({ ok: true });
});

export default telegram;
