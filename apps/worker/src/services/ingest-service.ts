import type { Client } from "@libsql/client/web";

import {
  CatalogWriteRepository,
  type BatchRunCounts,
} from "../repositories/catalog-write-repository";
import type { SqlExecutor } from "../lib/db";
import type {
  ClinicRecord,
  DoctorRecord,
  PromotionRecord,
  ReviewSummaryRecord,
  SourceBatchEnvelope,
} from "../types/ingest";
import { sha256, shortHash } from "../utils/hash";
import { normalizeAddress, normalizeText, slugify } from "../utils/normalize";

type IngestMeta = {
  githubRunId: string | null;
};

export type IngestResult = {
  processed_batches: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
};

export class IngestService {
  constructor(private readonly repo = new CatalogWriteRepository()) {}

  async ingest(
    client: Client,
    payload: SourceBatchEnvelope,
    meta: IngestMeta,
  ): Promise<IngestResult> {
    const sourceBatches = "sources" in payload ? payload.sources : [payload];
    const totals: IngestResult = {
      processed_batches: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    for (const batch of sourceBatches) {
      const batchId = await sha256(JSON.stringify(batch));
      const existingRun = await this.repo.getScrapeRunByBatchId(client, batchId);
      if (existingRun && String(existingRun.status) === "completed") {
        totals.skipped += 1;
        continue;
      }

      const scrapeRunId = existingRun ? String(existingRun.id) : crypto.randomUUID();
      const counts: BatchRunCounts = {
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
      };

      if (existingRun) {
        await this.repo.restartScrapeRun(client, {
          scrapeRunId,
          startedAt: batch.captured_at,
          githubRunId: meta.githubRunId,
        });
      } else {
        await this.repo.insertScrapeRun(client, {
          id: scrapeRunId,
          sourceName: batch.source,
          batchId,
          startedAt: batch.captured_at,
          githubRunId: meta.githubRunId,
        });
      }

      let tx: Awaited<ReturnType<Client["transaction"]>> | null = null;
      try {
        tx = await client.transaction("write");
        const clinicMap = new Map<string, string>();

        for (const clinic of batch.clinics) {
          const clinicId = await this.upsertClinic(tx, clinic, counts);
          clinicMap.set(clinic.external_id, clinicId);
        }

        const doctorMap = new Map<string, string>();
        for (const doctor of batch.doctors) {
          const doctorId = await this.upsertDoctor(tx, doctor, clinicMap, counts);
          doctorMap.set(doctor.external_id, doctorId);
        }

        for (const review of batch.review_summaries) {
          await this.upsertReviewSummary(tx, review, doctorMap, counts);
        }

        for (const promotion of batch.promotions) {
          await this.upsertPromotion(tx, promotion, clinicMap, counts);
        }

        await tx.commit();
        await this.repo.completeScrapeRun(
          client,
          scrapeRunId,
          "completed",
          counts,
          new Date().toISOString(),
          null,
        );

        totals.processed_batches += 1;
        totals.inserted += counts.inserted;
        totals.updated += counts.updated;
        totals.skipped += counts.skipped;
        totals.errors += counts.errors;
      } catch (error) {
        if (tx) {
          await tx.rollback().catch(() => undefined);
        }

        await this.repo.completeScrapeRun(
          client,
          scrapeRunId,
          "failed",
          counts,
          new Date().toISOString(),
          error instanceof Error ? error.message : "Unknown ingest error",
        );
        totals.errors += 1;
      }
    }

    return totals;
  }

  private async upsertClinic(
    db: SqlExecutor,
    clinic: ClinicRecord,
    counts: BatchRunCounts,
  ): Promise<string> {
    const normalizedName = normalizeText(clinic.name);
    const normalizedAddr = normalizeAddress(clinic.address);
    const checksum = await sha256(
      JSON.stringify({
        name: clinic.name,
        address: clinic.address,
        url: clinic.url,
      }),
    );

    const sourceRow = await this.repo.findClinicSource(db, clinic.source, clinic.external_id);
    if (sourceRow) {
      const clinicId = String(sourceRow.clinic_id);
      await this.repo.touchClinic(db, {
        clinicId,
        name: clinic.name,
        normalizedName,
        normalizedAddress: normalizedAddr || null,
        address: clinic.address ?? null,
        siteUrl: clinic.url,
        hasOnlineBooking: clinic.url ? 1 : 0,
        nowIso: clinic.captured_at,
      });
      await this.repo.upsertClinicSource(db, {
        id: String(sourceRow.id),
        clinicId,
        sourceName: clinic.source,
        externalKey: clinic.external_id,
        sourceUrl: clinic.source_url ?? clinic.url,
        checksum,
        lastSeenAt: clinic.captured_at,
      });
      counts.updated += 1;
      return clinicId;
    }

    const candidate = await this.repo.findClinicCandidate(
      db,
      normalizedName,
      normalizedAddr,
      clinic.city,
    );

    let clinicId: string;
    if (candidate) {
      clinicId = String(candidate.id);
      await this.repo.touchClinic(db, {
        clinicId,
        name: clinic.name,
        normalizedName,
        normalizedAddress: normalizedAddr || null,
        address: clinic.address ?? null,
        siteUrl: clinic.url,
        hasOnlineBooking: clinic.url ? 1 : 0,
        nowIso: clinic.captured_at,
      });
      counts.updated += 1;
    } else {
      clinicId = crypto.randomUUID();
      const slug = await this.uniqueSlug("clinic", clinic.name, clinic.external_id);
      await this.repo.insertClinic(db, {
        id: clinicId,
        slug,
        name: clinic.name,
        normalizedName,
        normalizedAddress: normalizedAddr || null,
        city: clinic.city,
        address: clinic.address ?? null,
        siteUrl: clinic.url,
        hasOnlineBooking: clinic.url ? 1 : 0,
        suppressionKey: `clinic:${slug}`,
        nowIso: clinic.captured_at,
      });
      counts.inserted += 1;
    }

    await this.repo.upsertClinicSource(db, {
      id: crypto.randomUUID(),
      clinicId,
      sourceName: clinic.source,
      externalKey: clinic.external_id,
      sourceUrl: clinic.source_url ?? clinic.url,
      checksum,
      lastSeenAt: clinic.captured_at,
    });

    return clinicId;
  }

  private async upsertDoctor(
    db: SqlExecutor,
    doctor: DoctorRecord,
    clinicMap: Map<string, string>,
    counts: BatchRunCounts,
  ): Promise<string> {
    const normalizedName = normalizeText(doctor.full_name);
    const checksum = await sha256(
      JSON.stringify({
        name: doctor.full_name,
        specialties: doctor.specialty_names,
        clinics: doctor.clinic_external_ids,
        url: doctor.url,
      }),
    );

    const primaryClinicId =
      doctor.clinic_external_ids.map((key) => clinicMap.get(key)).find(Boolean) ?? null;

    const sourceRow = await this.repo.findDoctorSource(db, doctor.source, doctor.external_id);
    let doctorId: string;
    if (sourceRow) {
      doctorId = String(sourceRow.doctor_id);
      await this.repo.touchDoctor(db, {
        doctorId,
        fullName: doctor.full_name,
        normalizedName,
        nowIso: doctor.captured_at,
      });
      await this.repo.upsertDoctorSource(db, {
        id: String(sourceRow.id),
        doctorId,
        clinicId: primaryClinicId,
        sourceName: doctor.source,
        externalKey: doctor.external_id,
        sourceUrl: doctor.source_url ?? doctor.url,
        bookingUrl: doctor.url,
        checksum,
        lastSeenAt: doctor.captured_at,
      });
      counts.updated += 1;
    } else {
      const candidates = await this.repo.findDoctorCandidates(db, normalizedName);
      const clinicTokenSet = new Set(
        doctor.clinic_external_ids
          .map((key) => clinicMap.get(key))
          .filter((item): item is string => Boolean(item)),
      );

      let matchedId: string | null = null;
      for (const candidate of candidates) {
        const candidateClinicIds = String(candidate.clinic_ids ?? "")
          .split(",")
          .filter(Boolean);
        const clinicHit =
          clinicTokenSet.size > 0 &&
          candidateClinicIds.some((clinicId) => clinicTokenSet.has(clinicId));
        if (clinicHit || candidates.length === 1) {
          matchedId = String(candidate.id);
          break;
        }
      }

      if (matchedId) {
        doctorId = matchedId;
        await this.repo.touchDoctor(db, {
          doctorId,
          fullName: doctor.full_name,
          normalizedName,
          nowIso: doctor.captured_at,
        });
        counts.updated += 1;
      } else {
        doctorId = crypto.randomUUID();
        const slug = await this.uniqueSlug("doctor", doctor.full_name, doctor.external_id);
        await this.repo.insertDoctor(db, {
          id: doctorId,
          slug,
          fullName: doctor.full_name,
          normalizedName,
          suppressionKey: `doctor:${slug}`,
          nowIso: doctor.captured_at,
        });
        counts.inserted += 1;
      }

      await this.repo.upsertDoctorSource(db, {
        id: crypto.randomUUID(),
        doctorId,
        clinicId: primaryClinicId,
        sourceName: doctor.source,
        externalKey: doctor.external_id,
        sourceUrl: doctor.source_url ?? doctor.url,
        bookingUrl: doctor.url,
        checksum,
        lastSeenAt: doctor.captured_at,
      });
    }

    for (let index = 0; index < doctor.specialty_names.length; index += 1) {
      const specialtyName = doctor.specialty_names[index];
      const specialtyId = await this.ensureSpecialty(db, specialtyName);
      await this.repo.upsertDoctorSpecialty(db, {
        doctorId,
        specialtyId,
        isPrimary: index === 0 ? 1 : 0,
      });
    }

    for (const clinicExternalId of doctor.clinic_external_ids) {
      const clinicId = clinicMap.get(clinicExternalId);
      if (!clinicId) {
        continue;
      }

      const relationKey = await sha256(`${doctorId}|${clinicId}|${doctor.url}`);
      await this.repo.upsertDoctorClinic(db, {
        id: crypto.randomUUID(),
        relationKey,
        doctorId,
        clinicId,
        bookingUrl: doctor.url,
        profileUrl: doctor.source_url ?? doctor.url,
        lastSeenAt: doctor.captured_at,
      });
    }

    return doctorId;
  }

  private async ensureSpecialty(db: SqlExecutor, specialtyName: string): Promise<string> {
    const normalizedName = normalizeText(specialtyName);
    const existing = await this.repo.findSpecialtyByNormalizedName(db, normalizedName);
    if (existing) {
      return String(existing.id);
    }

    const specialtyId = crypto.randomUUID();
    const slug = await this.uniqueSlug("specialty", specialtyName, specialtyId);
    await this.repo.insertSpecialty(db, {
      id: specialtyId,
      slug,
      name: specialtyName,
      normalizedName,
    });
    return specialtyId;
  }

  private async upsertReviewSummary(
    db: SqlExecutor,
    review: ReviewSummaryRecord,
    doctorMap: Map<string, string>,
    counts: BatchRunCounts,
  ) {
    if (review.subject_type !== "doctor") {
      counts.skipped += 1;
      return;
    }

    const doctorId = doctorMap.get(review.subject_external_id);
    if (!doctorId) {
      counts.skipped += 1;
      return;
    }

    const scopeKey = await sha256(`${review.source}|doctor|${doctorId}`);
    await this.repo.upsertReviewSummary(db, {
      id: crypto.randomUUID(),
      scopeKey,
      doctorId,
      clinicId: null,
      doctorClinicId: null,
      sourceName: review.source,
      sourcePageUrl: review.source_url ?? review.url,
      ratingAvg: review.rating_value ?? null,
      reviewsCount: review.review_count,
      capturedAt: review.captured_at,
    });
    counts.updated += 1;
  }

  private async upsertPromotion(
    db: SqlExecutor,
    promotion: PromotionRecord,
    clinicMap: Map<string, string>,
    counts: BatchRunCounts,
  ) {
    const clinicId = promotion.clinic_external_id
      ? clinicMap.get(promotion.clinic_external_id)
      : null;

    if (!clinicId) {
      counts.skipped += 1;
      return;
    }

    const fingerprintHash = await sha256(
      JSON.stringify({
        source: promotion.source,
        external_id: promotion.external_id,
        clinic_external_id: promotion.clinic_external_id,
        title: promotion.title,
        url: promotion.url,
      }),
    );

    const existing = await this.repo.findPromotionByFingerprint(db, fingerprintHash);
    const isActive =
      !promotion.valid_until || promotion.valid_until >= new Date().toISOString() ? 1 : 0;

    const promotionId = existing ? String(existing.id) : crypto.randomUUID();
    await this.repo.upsertPromotion(db, {
      id: promotionId,
      clinicId,
      doctorId: null,
      title: promotion.title,
      sourceName: promotion.source,
      sourceUrl: promotion.source_url ?? promotion.url,
      endsAt: promotion.valid_until ?? null,
      fingerprintHash,
      lastSeenAt: promotion.captured_at,
      isActive,
    });

    const materialChange =
      !existing ||
      String(existing.title ?? "") !== promotion.title ||
      String(existing.source_url ?? "") !== (promotion.source_url ?? promotion.url) ||
      String(existing.ends_at ?? "") !== String(promotion.valid_until ?? "");

    if (materialChange) {
      const dedupeKey = await sha256(`${fingerprintHash}|${promotion.captured_at}`);
      await this.repo.insertOutboxIfMissing(db, {
        id: crypto.randomUUID(),
        entityId: promotionId,
        dedupeKey,
        payloadJson: JSON.stringify({
          title: promotion.title,
          source_url: promotion.source_url ?? promotion.url,
          clinic_id: clinicId,
        }),
        createdAt: promotion.captured_at,
      });
    }

    counts[existing ? "updated" : "inserted"] += 1;
  }

  private async uniqueSlug(prefix: string, value: string, suffixSeed: string): Promise<string> {
    const base = slugify(value, prefix);
    const suffix = await shortHash(`${prefix}|${suffixSeed}`);
    return `${base}-${suffix}`;
  }
}
