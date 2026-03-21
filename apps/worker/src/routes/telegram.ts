import { Hono } from "hono";
import { z } from "zod";

import type { WorkerBindings } from "../env";
import { errorJson } from "../utils/http";
import { TelegramBotService } from "../services/telegram-bot-service";

const telegram = new Hono<{ Bindings: WorkerBindings }>();

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

  if (!providedSecret || providedSecret !== bot.webhookSecret()) {
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
