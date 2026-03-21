import { z } from "zod";

export const clinicRecordSchema = z.object({
  source: z.string().min(1),
  external_id: z.string().min(1),
  name: z.string().min(1),
  url: z.url(),
  address: z.string().nullable().optional(),
  city: z.string().default("Минск"),
  source_url: z.url().nullable().optional(),
  captured_at: z.string().min(1),
});

export const doctorRecordSchema = z.object({
  source: z.string().min(1),
  external_id: z.string().min(1),
  full_name: z.string().min(1),
  url: z.url(),
  specialty_names: z.array(z.string().min(1)).default([]),
  clinic_external_ids: z.array(z.string().min(1)).default([]),
  source_url: z.url().nullable().optional(),
  city: z.string().default("Минск"),
  captured_at: z.string().min(1),
});

export const promotionRecordSchema = z.object({
  source: z.string().min(1),
  external_id: z.string().min(1),
  title: z.string().min(1),
  url: z.url(),
  clinic_external_id: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  source_url: z.url().nullable().optional(),
  captured_at: z.string().min(1),
});

export const reviewSummaryRecordSchema = z.object({
  source: z.string().min(1),
  subject_type: z.string().min(1),
  subject_external_id: z.string().min(1),
  rating_value: z.number().nullable().optional(),
  review_count: z.number().int().nonnegative(),
  url: z.url(),
  source_url: z.url().nullable().optional(),
  captured_at: z.string().min(1),
});

export const scrapeReportSchema = z
  .object({
    source: z.string().min(1),
    status: z.string().min(1),
    notes: z.array(z.string()).default([]),
    doctors_found: z.number().int().nonnegative().default(0),
    clinics_found: z.number().int().nonnegative().default(0),
    promotions_found: z.number().int().nonnegative().default(0),
    review_summaries_found: z.number().int().nonnegative().default(0),
    started_at: z.string().min(1),
    finished_at: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

export const sourceBatchSchema = z.object({
  source: z.string().min(1),
  captured_at: z.string().min(1),
  doctors: z.array(doctorRecordSchema).default([]),
  clinics: z.array(clinicRecordSchema).default([]),
  promotions: z.array(promotionRecordSchema).default([]),
  review_summaries: z.array(reviewSummaryRecordSchema).default([]),
  report: scrapeReportSchema,
  batch_version: z.number().int().positive().optional(),
});

export const sourceBatchEnvelopeSchema = z.union([
  sourceBatchSchema,
  z.object({
    batch_count: z.number().int().positive(),
    sources: z.array(sourceBatchSchema),
  }),
]);

export type ClinicRecord = z.infer<typeof clinicRecordSchema>;
export type DoctorRecord = z.infer<typeof doctorRecordSchema>;
export type PromotionRecord = z.infer<typeof promotionRecordSchema>;
export type ReviewSummaryRecord = z.infer<typeof reviewSummaryRecordSchema>;
export type SourceBatch = z.infer<typeof sourceBatchSchema>;
export type SourceBatchEnvelope = z.infer<typeof sourceBatchEnvelopeSchema>;
