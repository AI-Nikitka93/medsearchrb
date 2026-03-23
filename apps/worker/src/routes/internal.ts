import { Hono } from "hono";

import type { WorkerBindings } from "../env";
import { ensureDbReady } from "../lib/db";
import { IngestService } from "../services/ingest-service";
import { PromotionAiService } from "../services/promotion-ai-service";
import { PromotionChannelService } from "../services/promotion-channel-service";
import { sourceBatchEnvelopeSchema } from "../types/ingest";
import { errorJson } from "../utils/http";

const internal = new Hono<{ Bindings: WorkerBindings }>();
const ingestService = new IngestService();
const promotionChannelService = new PromotionChannelService();
const promotionAiService = new PromotionAiService();

function isAuthorized(
  secret: string,
  authorizationHeader: string | undefined,
  fallbackToken: string | undefined,
) {
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length) === secret;
  }

  if (fallbackToken) {
    return fallbackToken === secret;
  }

  return false;
}

internal.post("/ingest/source-batch", async (c) => {
  if (
    !isAuthorized(
      c.env.INGEST_SHARED_SECRET,
      c.req.header("authorization"),
      c.req.header("x-ingest-token"),
    )
  ) {
    return errorJson(c, 401, "UNAUTHORIZED", "ingest token is invalid", false);
  }

  const payload = await c.req.json().catch(() => null);
  const parsed = sourceBatchEnvelopeSchema.safeParse(payload);
  if (!parsed.success) {
    return errorJson(c, 400, "INVALID_BATCH", parsed.error.message, false);
  }

  const client = await ensureDbReady(c.env);
  const result = await ingestService.ingest(client, parsed.data, {
    githubRunId: c.req.header("x-github-run-id") ?? null,
  });

  return c.json({
    ok: true,
    result,
  });
});

internal.post("/notifications/promotions/flush", async (c) => {
  if (
    !isAuthorized(
      c.env.INGEST_SHARED_SECRET,
      c.req.header("authorization"),
      c.req.header("x-ingest-token"),
    )
  ) {
    return errorJson(c, 401, "UNAUTHORIZED", "ingest token is invalid", false);
  }

  const client = await ensureDbReady(c.env);
  const result = await promotionChannelService.dispatchPendingWithClient(client, c.env);

  return c.json({
    ok: true,
    result,
  });
});

internal.post("/ai/promotions/audit", async (c) => {
  if (
    !isAuthorized(
      c.env.INGEST_SHARED_SECRET,
      c.req.header("authorization"),
      c.req.header("x-ingest-token"),
    )
  ) {
    return errorJson(c, 401, "UNAUTHORIZED", "ingest token is invalid", false);
  }

  const payload = (await c.req.json().catch(() => null)) as
    | {
        title?: string;
        clinic_name?: string | null;
        source_name?: string | null;
        source_url?: string;
        ends_at?: string | null;
        page_text?: string | null;
      }
    | null;

  const title = payload?.title?.trim() ?? "";
  const sourceUrl = payload?.source_url?.trim() ?? "";

  if (!title || !sourceUrl) {
    return errorJson(
      c,
      400,
      "INVALID_PROMOTION_AUDIT",
      "title and source_url are required",
      false,
    );
  }

  const result = await promotionAiService.auditPromotion(c.env, {
    title,
    clinicName: payload?.clinic_name ?? null,
    sourceName: payload?.source_name ?? null,
    sourceUrl,
    endsAt: payload?.ends_at ?? null,
    pageText: payload?.page_text ?? null,
  });

  return c.json({
    ok: true,
    result,
  });
});

export default internal;
