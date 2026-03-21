import { Hono } from "hono";

import type { WorkerBindings } from "../env";
import { ensureDbReady } from "../lib/db";
import { IngestService } from "../services/ingest-service";
import { sourceBatchEnvelopeSchema } from "../types/ingest";
import { errorJson } from "../utils/http";

const internal = new Hono<{ Bindings: WorkerBindings }>();
const ingestService = new IngestService();

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

export default internal;
