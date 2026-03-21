import { Hono } from "hono";
import { z } from "zod";

import type { WorkerBindings } from "../env";
import { ensureDbReady } from "../lib/db";
import { DoctorsService } from "../services/doctors-service";
import { PromotionsService } from "../services/promotions-service";
import { errorJson, parsePositiveInt } from "../utils/http";
import { normalizeText } from "../utils/normalize";

const api = new Hono<{ Bindings: WorkerBindings }>();
const doctorsService = new DoctorsService();
const promotionsService = new PromotionsService();

const doctorQuerySchema = z.object({
  q: z.string().optional(),
  specialty: z.string().optional(),
  clinic: z.string().optional(),
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

export default api;
