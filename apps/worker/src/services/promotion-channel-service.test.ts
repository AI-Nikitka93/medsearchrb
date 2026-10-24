import { strict as assert } from "node:assert";
import { test } from "node:test";

import type { Client } from "@libsql/client/web";

import type { WorkerBindings } from "../env";
import type {
  NotificationOutboxRepository,
  PostedPromotionEvent,
} from "../repositories/notification-outbox-repository";
import type { PromotionAiService } from "./promotion-ai-service";
import { PromotionChannelService } from "./promotion-channel-service";

const env = {
  TURSO_DATABASE_URL: "libsql://test",
  TURSO_AUTH_TOKEN: "test",
  INGEST_SHARED_SECRET: "test",
  BOT_TOKEN: "test-token",
  TELEGRAM_CHANNEL_ID: "@test-channel",
} satisfies WorkerBindings;

const payload = {
  promotion_id: "promotion-1",
  title: "Скидка на обследование",
  description_short: "Предложение и условия из источника",
  source_url: "https://clinic.example/promo",
  ends_at: "2026-12-31",
  published_at: "2026-10-20",
  clinic_name: "Клиника",
  clinic_site_url: "https://clinic.example",
  source_name: "test-source",
};

function makeRepository(overrides: Record<string, unknown> = {}) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const repository = {
    claimPendingPromotionEvents: async () => [
      {
        id: "outbox-1",
        entity_id: "promotion-1",
        dedupe_key: "key-1",
        payload_json: "{}",
        attempt_count: 1,
      },
    ],
    getPromotionChannelPayload: async () => payload,
    markFailed: async (...args: unknown[]) => calls.push({ method: "markFailed", args }),
    markDiscarded: async (...args: unknown[]) => calls.push({ method: "markDiscarded", args }),
    markSent: async (...args: unknown[]) => calls.push({ method: "markSent", args }),
    deactivatePromotion: async (...args: unknown[]) => calls.push({ method: "deactivatePromotion", args }),
    getSentPromotionDelivery: async () => null,
    markSuperseded: async (...args: unknown[]) => calls.push({ method: "markSuperseded", args }),
    listExpiredPostedPromotions: async () => [],
    listPostedPromotionsForSourceCheck: async () => null,
    markPostedPromotionChecked: async (...args: unknown[]) => calls.push({ method: "markPostedPromotionChecked", args }),
    ...overrides,
  } as unknown as NotificationOutboxRepository;

  return { repository, calls };
}

function postedPromotion(overrides: Partial<PostedPromotionEvent> = {}): PostedPromotionEvent {
  return {
    outbox_id: "outbox-1",
    promotion_id: "promotion-1",
    title: "Скидка на обследование",
    description_short: "Условия акции",
    source_url: "https://clinic.example/promo",
    ends_at: "2026-10-23",
    published_at: "2026-10-20",
    clinic_name: "Клиника",
    clinic_site_url: "https://clinic.example",
    source_name: "test-source",
    telegram_chat_id: "-1001234567890",
    telegram_message_id: 42,
    is_active: 1,
    ...overrides,
  };
}

function replaceFetch(handler: typeof fetch) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = original;
  };
}

test("an HTTP error from a promotion source does not deactivate or publish it", async () => {
  const { repository, calls } = makeRepository();
  const restoreFetch = replaceFetch(async () => new Response("unavailable", { status: 503 }));

  try {
    const service = new PromotionChannelService(repository, 10, {} as PromotionAiService);
    const result = await service.dispatchPendingWithClient({} as Client, env);

    assert.equal(result.sent, 0);
    assert.equal(result.failed, 1);
    assert.equal(calls.some((call) => call.method === "deactivatePromotion"), false);
    const failedCall = calls.find((call) => call.method === "markFailed");
    assert.ok(failedCall);
    assert.match(String(failedCall.args[2]), /does not confirm that it ended/);
    assert.equal(failedCall.args[4], 6 * 60 * 60 * 1000);
  } finally {
    restoreFetch();
  }
});

test("a generic promotion heading is deferred when it has no offer details", async () => {
  const { repository, calls } = makeRepository({
    getPromotionChannelPayload: async () => ({
      ...payload,
      title: "Скидки и акции месяца",
      description_short: null,
    }),
  });
  let requested = false;
  const restoreFetch = replaceFetch(async () => {
    requested = true;
    throw new Error("unexpected network request");
  });

  try {
    const service = new PromotionChannelService(repository, 10, {} as PromotionAiService);
    const result = await service.dispatchPendingWithClient({} as Client, env);

    assert.equal(result.sent, 0);
    assert.equal(result.skipped, 1);
    assert.equal(requested, false);
    const failedCall = calls.find((call) => call.method === "markFailed");
    assert.ok(failedCall);
    assert.match(String(failedCall.args[2]), /Generic promotion title/);
  } finally {
    restoreFetch();
  }
});

test("offers from one article share one source-page check", async () => {
  const offers = [
    { ...payload, promotion_id: "promotion-1", title: "Offer one" },
    { ...payload, promotion_id: "promotion-2", title: "Offer two" },
  ];
  let payloadIndex = 0;
  const { repository } = makeRepository({
    claimPendingPromotionEvents: async () => [
      { id: "outbox-1", entity_id: "promotion-1", dedupe_key: "key-1", payload_json: "{}", attempt_count: 1 },
      { id: "outbox-2", entity_id: "promotion-2", dedupe_key: "key-2", payload_json: "{}", attempt_count: 1 },
    ],
    getPromotionChannelPayload: async () => offers[payloadIndex++],
  });
  let sourceFetches = 0;
  let telegramSends = 0;
  const restoreFetch = replaceFetch(async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === payload.source_url) {
      sourceFetches += 1;
      return new Response("Current offers are available", { status: 200 });
    }

    telegramSends += 1;
    return new Response(JSON.stringify({
      ok: true,
      result: { message_id: 40 + telegramSends, chat: { id: -1001234567890 } },
    }), { status: 200, headers: { "content-type": "application/json" } });
  });

  try {
    const service = new PromotionChannelService(
      repository,
      10,
      { isAvailable: () => false } as unknown as PromotionAiService,
    );
    const result = await service.dispatchPendingWithClient({} as Client, env);

    assert.equal(result.sent, 2);
    assert.equal(sourceFetches, 1);
    assert.equal(telegramSends, 2);
  } finally {
    restoreFetch();
  }
});

test("a published post with an expired end date is edited without fetching the source", async () => {
  const post = postedPromotion();
  const { repository, calls } = makeRepository({
    claimPendingPromotionEvents: async () => [],
    listExpiredPostedPromotions: async () => [post],
  });
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const restoreFetch = replaceFetch(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    requests.push({ url, body });
    return new Response(JSON.stringify({ ok: true, result: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  try {
    const service = new PromotionChannelService(repository, 10, {} as PromotionAiService);
    const result = await service.auditPostedPromotionsWithClient({} as Client, env);

    assert.equal(result.date_expired, 1);
    assert.equal(result.edited, 1);
    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /api\.telegram\.org\/bot.*\/editMessageText$/);
    assert.equal(requests[0].body.chat_id, post.telegram_chat_id);
    assert.equal(requests[0].body.message_id, post.telegram_message_id);
    assert.match(String(requests[0].body.text), /Акция завершена/);
    assert.match(String(requests[0].body.text), /Условия акции/);
    assert.equal(calls.some((call) => call.method === "deactivatePromotion"), true);
    assert.equal(calls.some((call) => call.method === "markPostedPromotionChecked"), true);
  } finally {
    restoreFetch();
  }
});

test("a promotion update edits its existing channel post instead of sending a duplicate", async () => {
  const delivery = {
    outbox_id: "sent-outbox",
    chat_id: "-1001234567890",
    message_id: 41,
  };
  const { repository, calls } = makeRepository({
    getSentPromotionDelivery: async () => delivery,
  });
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const restoreFetch = replaceFetch(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === payload.source_url) {
      return new Response("Offer and conditions remain available", { status: 200 });
    }

    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    requests.push({ url, body });
    return new Response(JSON.stringify({ ok: true, result: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  try {
    const service = new PromotionChannelService(
      repository,
      10,
      { isAvailable: () => false } as unknown as PromotionAiService,
    );
    const result = await service.dispatchPendingWithClient({} as Client, env);

    assert.equal(result.sent, 0);
    assert.equal(result.edited, 1);
    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /api\.telegram\.org\/bot.*\/editMessageText$/);
    assert.equal(requests[0].body.message_id, delivery.message_id);
    assert.match(String(requests[0].body.text), /Предложение и условия из источника/);
    assert.equal(calls.some((call) => call.method === "markSuperseded"), true);
  } finally {
    restoreFetch();
  }
});
