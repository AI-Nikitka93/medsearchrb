import { Hono } from "hono";
import { cors } from "hono/cors";

import type { WorkerBindings } from "./env";
import api from "./routes/api";
import internal from "./routes/internal";
import telegram from "./routes/telegram";
import { PromotionChannelService } from "./services/promotion-channel-service";

const app = new Hono<{ Bindings: WorkerBindings }>();
const promotionChannelService = new PromotionChannelService();

function allowedOrigins(env: WorkerBindings): string[] {
  const raw =
    env.ALLOWED_ORIGINS ??
    "https://medsearch-minsk-miniapp.netlify.app,http://localhost:3000,http://127.0.0.1:3000";

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      if (!origin) {
        return null;
      }

      return allowedOrigins(c.env).includes(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Ingest-Token", "X-GitHub-Run-Id"],
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "medsearchrb-api",
    version: c.env.API_VERSION ?? "v1",
    env: c.env.APP_ENV ?? "development",
    author: "Nikita",
    nickname: "AI_Nikitka93",
    today: "2026-03-21",
  }),
);

app.route("/api/v1", api);
app.route("/internal", internal);
app.route("/telegram", telegram);

app.notFound((c) =>
  c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "route not found",
        request_id: c.req.header("cf-ray") ?? crypto.randomUUID(),
        retryable: false,
      },
    },
    404,
  ),
);

app.onError((error, c) => {
  console.error("worker_error", error);
  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "unexpected server error",
        request_id: c.req.header("cf-ray") ?? crypto.randomUUID(),
        retryable: false,
      },
    },
    500,
  );
});

export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: WorkerBindings, ctx: ExecutionContext) {
    ctx.waitUntil(
      promotionChannelService.dispatchPending(env).catch((error) => {
        console.error("promotion_channel_cron_error", error);
      }),
    );
  },
};
