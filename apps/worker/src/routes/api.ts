import { Hono } from "hono";
import { z } from "zod";

import type { WorkerBindings } from "../env";
import { ensureDbReady } from "../lib/db";
import { DoctorsService } from "../services/doctors-service";
import { PromotionsService } from "../services/promotions-service";
import { SearchAiService } from "../services/search-ai-service";
import { errorJson, parsePositiveInt } from "../utils/http";
import { normalizeText } from "../utils/normalize";
import { verifyTelegramInitData } from "../utils/telegram-auth";

const api = new Hono<{ Bindings: WorkerBindings }>();
const doctorsService = new DoctorsService();
const promotionsService = new PromotionsService();
const searchAiService = new SearchAiService();

const doctorQuerySchema = z.object({
  q: z.string().optional(),
  specialty: z.string().optional(),
  clinic: z.string().optional(),
});

const searchUnderstandSchema = z.object({
  q: z.string().trim().min(2).max(200),
  provider: z.enum(["auto", "cloudflare", "groq"]).optional(),
});

const telegramSessionSchema = z.object({
  init_data: z.string().trim().min(1).max(8192),
});

api.get("/doctors", async (c) => {
  const query = doctorQuerySchema.safeParse({
    q: c.req.query("q"),
    specialty: c.req.query("specialty"),
    clinic: c.req.query("clinic"),
  });

  if (!query.success) {
    return errorJson(c, 400, "INVALID_FILTERS", query.error.message, false);
  }

  const client = await ensureDbReady(c.env);
  const result = await doctorsService.list(client, {
    q: query.data.q ? normalizeText(query.data.q) : undefined,
    specialty: query.data.specialty ? normalizeText(query.data.specialty) : undefined,
    clinic: query.data.clinic ? normalizeText(query.data.clinic) : undefined,
    page: parsePositiveInt(c.req.query("page"), 1, 500),
    perPage: parsePositiveInt(c.req.query("per_page"), 20, 50),
  });

  return c.json(result);
});

api.get("/doctors/:id", async (c) => {
  const doctorId = c.req.param("id");
  const client = await ensureDbReady(c.env);
  const doctor = await doctorsService.getById(client, doctorId);
  if (!doctor) {
    return errorJson(c, 404, "DOCTOR_NOT_FOUND", "doctor not found", false);
  }

  return c.json({ item: doctor });
});

api.get("/promotions", async (c) => {
  const client = await ensureDbReady(c.env);
  const result = await promotionsService.list(client, {
    clinic: c.req.query("clinic")
      ? normalizeText(c.req.query("clinic") as string)
      : undefined,
    page: parsePositiveInt(c.req.query("page"), 1, 500),
    perPage: parsePositiveInt(c.req.query("per_page"), 20, 50),
  });

  return c.json(result);
});

api.get("/search/understand", async (c) => {
  const query = searchUnderstandSchema.safeParse({
    q: c.req.query("q"),
    provider: c.req.query("provider") ?? undefined,
  });

  if (!query.success) {
    return errorJson(c, 400, "INVALID_SEARCH_QUERY", query.error.message, false);
  }

  const result = await searchAiService.understandQuery(
    c.env,
    query.data.q,
    query.data.provider ?? "auto",
  );

  return c.json(result);
});

api.post("/telegram/session", async (c) => {
  const payload = await c.req.json().catch(() => null);
  const parsed = telegramSessionSchema.safeParse(payload);

  if (!parsed.success) {
    return errorJson(c, 400, "INVALID_TELEGRAM_INIT_DATA", parsed.error.message, false);
  }

  const botToken = c.env.BOT_TOKEN?.trim();
  if (!botToken) {
    return errorJson(c, 503, "BOT_TOKEN_MISSING", "telegram bot token is not configured", false);
  }

  try {
    const session = await verifyTelegramInitData({
      botToken,
      initData: parsed.data.init_data,
      maxAgeSeconds: parsePositiveInt(
        c.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS,
        3600,
        86400,
      ),
    });

    return c.json({
      ok: true,
      session,
    });
  } catch (error) {
    return errorJson(
      c,
      401,
      "TELEGRAM_INIT_DATA_INVALID",
      error instanceof Error ? error.message : "telegram init data is invalid",
      false,
    );
  }
});

export default api;
