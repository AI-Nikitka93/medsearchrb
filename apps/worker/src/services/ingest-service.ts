import type { Client } from "@libsql/client/web";

import {
  CatalogWriteRepository,
  type BatchRunCounts,
} from "../repositories/catalog-write-repository";
import type { SqlExecutor } from "../lib/db";
import type {
  ClinicRecord,
  DoctorClinicLinkRecord,
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
    const sourceType = this.normalizeSourceType(clinic.source_type);
    const isOfficial = clinic.is_official ?? this.isOfficialSourceType(sourceType);
    const siteUrl = clinic.site_url ?? (isOfficial ? clinic.url : null);
    const bookingUrlOfficial =
      clinic.booking_url_official ??
      (sourceType === "official_booking_widget" ? clinic.url : null);
    const officialDirectoryUrl =
      clinic.official_directory_url ??
      (sourceType === "official_directory" ? clinic.url : null);
    const officialBookingWidgetUrl =
      clinic.official_booking_widget_url ??
      (sourceType === "official_booking_widget" ? clinic.url : null);
    const verificationStatus =
      clinic.verification_status ??
      (isOfficial ? "official_source" : "unverified");
    const sourcePriority =
      clinic.source_priority ??
      (sourceType === "official_booking_widget"
        ? 5
        : sourceType === "official_directory"
          ? 10
          : isOfficial
            ? 20
            : 100);

    const normalizedName = normalizeText(clinic.name);
    const normalizedAddr = normalizeAddress(clinic.address);
    const checksum = await sha256(
      JSON.stringify({
        name: clinic.name,
        address: clinic.address,
        url: clinic.url,
        source_type: sourceType,
        verification_status: verificationStatus,
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
        siteUrl,
        bookingUrlOfficial,
        officialDirectoryUrl,
        officialBookingWidgetUrl,
        verificationStatus,
        officialLastVerifiedAt: clinic.official_last_verified_at ?? null,
        officialVerificationNotes: clinic.official_verification_notes ?? null,
        isOfficial: isOfficial ? 1 : 0,
        hasOnlineBooking: bookingUrlOfficial || officialBookingWidgetUrl || clinic.url ? 1 : 0,
        nowIso: clinic.captured_at,
      });
      await this.repo.upsertClinicSource(db, {
        id: String(sourceRow.id),
        clinicId,
        sourceName: clinic.source,
        externalKey: clinic.external_id,
        sourceUrl: clinic.source_url ?? clinic.url,
        sourceType,
        isOfficial: isOfficial ? 1 : 0,
        sourcePriority,
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
        siteUrl,
        bookingUrlOfficial,
        officialDirectoryUrl,
        officialBookingWidgetUrl,
        verificationStatus,
        officialLastVerifiedAt: clinic.official_last_verified_at ?? null,
        officialVerificationNotes: clinic.official_verification_notes ?? null,
        isOfficial: isOfficial ? 1 : 0,
        hasOnlineBooking: bookingUrlOfficial || officialBookingWidgetUrl || clinic.url ? 1 : 0,
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
        siteUrl,
        bookingUrlOfficial,
        officialDirectoryUrl,
        officialBookingWidgetUrl,
        verificationStatus,
        officialLastVerifiedAt: clinic.official_last_verified_at ?? null,
        officialVerificationNotes: clinic.official_verification_notes ?? null,
        hasOnlineBooking: bookingUrlOfficial || officialBookingWidgetUrl || clinic.url ? 1 : 0,
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
      sourceType,
      isOfficial: isOfficial ? 1 : 0,
      sourcePriority,
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
    const sourceType = this.normalizeSourceType(doctor.source_type);
    const verifiedOnClinicSite =
      (
        doctor.verified_on_clinic_site ??
        Boolean(doctor.official_profile_url || doctor.official_booking_url)
      ) || this.isOfficialSourceType(sourceType);
    const verificationStatus =
      doctor.verification_status ??
      (verifiedOnClinicSite ? "official_verified" : "aggregator_only");
    const confidenceScore =
      doctor.confidence_score ??
      (verifiedOnClinicSite ? 0.95 : 0.35);
    const preferredBookingUrl =
      doctor.official_booking_url ?? doctor.booking_url ?? doctor.url;
    const preferredProfileUrl =
      doctor.official_profile_url ?? doctor.profile_url ?? doctor.source_url ?? doctor.url;

    const normalizedName = normalizeText(doctor.full_name);
    const checksum = await sha256(
      JSON.stringify({
        name: doctor.full_name,
        specialties: doctor.specialty_names,
        clinics: doctor.clinic_external_ids,
        url: doctor.url,
        source_type: sourceType,
        verification_status: verificationStatus,
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
        bookingUrl: preferredBookingUrl,
        profileUrl: preferredProfileUrl,
        officialProfileUrl: doctor.official_profile_url ?? null,
        sourceType,
        verificationStatus,
        verifiedOnClinicSite: verifiedOnClinicSite ? 1 : 0,
        lastVerifiedAt: doctor.last_verified_at ?? (verifiedOnClinicSite ? doctor.captured_at : null),
        confidenceScore,
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
        bookingUrl: preferredBookingUrl,
        profileUrl: preferredProfileUrl,
        officialProfileUrl: doctor.official_profile_url ?? null,
        sourceType,
        verificationStatus,
        verifiedOnClinicSite: verifiedOnClinicSite ? 1 : 0,
        lastVerifiedAt: doctor.last_verified_at ?? (verifiedOnClinicSite ? doctor.captured_at : null),
        confidenceScore,
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

    const clinicLinks = this.buildClinicLinks(doctor);
    for (const clinicLink of clinicLinks) {
      const clinicId = clinicMap.get(clinicLink.clinic_external_id);
      if (!clinicId) {
        continue;
      }

      const relationMeta = this.buildRelationMeta(doctor, clinicLink);
      const relationKey = await sha256(
        `${doctorId}|${clinicId}|${relationMeta.relationSourceUrl ?? relationMeta.profileUrl ?? relationMeta.bookingUrl ?? doctor.url}`,
      );
      await this.repo.upsertDoctorClinic(db, {
        id: crypto.randomUUID(),
        relationKey,
        doctorId,
        clinicId,
        bookingUrl: relationMeta.bookingUrl,
        profileUrl: relationMeta.profileUrl,
        positionTitle: relationMeta.positionTitle,
        sourceType: relationMeta.sourceType,
        relationSourceUrl: relationMeta.relationSourceUrl,
        officialProfileUrl: relationMeta.officialProfileUrl,
        officialBookingUrl: relationMeta.officialBookingUrl,
        aggregatorProfileUrl: relationMeta.aggregatorProfileUrl,
        aggregatorBookingUrl: relationMeta.aggregatorBookingUrl,
        verifiedOnClinicSite: relationMeta.verifiedOnClinicSite ? 1 : 0,
        verificationStatus: relationMeta.verificationStatus,
        lastVerifiedAt: relationMeta.lastVerifiedAt,
        confidenceScore: relationMeta.confidenceScore,
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

  private normalizeSourceType(sourceType: string | undefined) {
    const normalized = normalizeText(sourceType ?? "").replace(/\s+/g, "_");
    return normalized || "aggregator";
  }

  private isOfficialSourceType(sourceType: string) {
    return sourceType.startsWith("official");
  }

  private buildClinicLinks(doctor: DoctorRecord): DoctorClinicLinkRecord[] {
    if (doctor.clinic_links.length > 0) {
      return doctor.clinic_links;
    }

    return doctor.clinic_external_ids.map((clinicExternalId) => ({
      clinic_external_id: clinicExternalId,
      relation_source_url: doctor.source_url ?? doctor.url,
      booking_url: doctor.booking_url ?? doctor.url,
      profile_url: doctor.profile_url ?? doctor.source_url ?? doctor.url,
      official_booking_url: doctor.official_booking_url ?? null,
      official_profile_url: doctor.official_profile_url ?? null,
      aggregator_booking_url: doctor.booking_url ?? doctor.url,
      aggregator_profile_url: doctor.profile_url ?? doctor.source_url ?? doctor.url,
      source_type: doctor.source_type ?? "aggregator",
      verification_status: doctor.verification_status ?? "aggregator_only",
      verified_on_clinic_site: doctor.verified_on_clinic_site ?? false,
      last_verified_at: doctor.last_verified_at ?? null,
      confidence_score: doctor.confidence_score ?? undefined,
      position_title: null,
    }));
  }

  private buildRelationMeta(doctor: DoctorRecord, clinicLink: DoctorClinicLinkRecord) {
    const sourceType = this.normalizeSourceType(
      clinicLink.source_type ?? doctor.source_type,
    );
    const verifiedOnClinicSite =
      (
        clinicLink.verified_on_clinic_site ??
        doctor.verified_on_clinic_site ??
        Boolean(clinicLink.official_profile_url || clinicLink.official_booking_url)
      ) || this.isOfficialSourceType(sourceType);
    const officialProfileUrl =
      clinicLink.official_profile_url ?? doctor.official_profile_url ?? null;
    const officialBookingUrl =
      clinicLink.official_booking_url ?? doctor.official_booking_url ?? null;
    const aggregatorProfileUrl =
      clinicLink.aggregator_profile_url ??
      clinicLink.profile_url ??
      doctor.profile_url ??
      doctor.source_url ??
      doctor.url;
    const aggregatorBookingUrl =
      clinicLink.aggregator_booking_url ??
      clinicLink.booking_url ??
      doctor.booking_url ??
      doctor.url;
    const verificationStatus =
      clinicLink.verification_status ??
      doctor.verification_status ??
      (verifiedOnClinicSite ? "official_verified" : "aggregator_only");
    const confidenceScore =
      clinicLink.confidence_score ??
      doctor.confidence_score ??
      (verifiedOnClinicSite ? 0.95 : 0.35);

    return {
      sourceType,
      verifiedOnClinicSite,
      verificationStatus,
      confidenceScore,
      officialProfileUrl,
      officialBookingUrl,
      aggregatorProfileUrl,
      aggregatorBookingUrl,
      profileUrl: officialProfileUrl ?? clinicLink.profile_url ?? doctor.profile_url ?? doctor.source_url ?? doctor.url,
      bookingUrl: officialBookingUrl ?? clinicLink.booking_url ?? doctor.booking_url ?? doctor.url,
      relationSourceUrl:
        clinicLink.relation_source_url ??
        officialProfileUrl ??
        clinicLink.profile_url ??
        doctor.source_url ??
        doctor.url,
      lastVerifiedAt:
        clinicLink.last_verified_at ??
        doctor.last_verified_at ??
        (verifiedOnClinicSite ? doctor.captured_at : null),
      positionTitle: clinicLink.position_title ?? null,
    };
  }
}
