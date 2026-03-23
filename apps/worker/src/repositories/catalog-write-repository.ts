import type { SqlExecutor } from "../lib/db";

export type BatchRunCounts = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
};

export class CatalogWriteRepository {
  async getScrapeRunByBatchId(db: SqlExecutor, batchId: string) {
    const result = await db.execute({
      sql: `SELECT id, status FROM scrape_runs WHERE batch_id = ? LIMIT 1`,
      args: [batchId],
    });

    return result.rows[0] ?? null;
  }

  async insertScrapeRun(
    db: SqlExecutor,
    params: {
      id: string;
      sourceName: string;
      batchId: string;
      startedAt: string;
      githubRunId: string | null;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO scrape_runs (
          id, source_name, github_run_id, batch_id, status, started_at,
          inserted_count, updated_count, skipped_count, error_count
        )
        VALUES (?, ?, ?, ?, 'running', ?, 0, 0, 0, 0)
      `,
      args: [
        params.id,
        params.sourceName,
        params.githubRunId,
        params.batchId,
        params.startedAt,
      ],
    });
  }

  async restartScrapeRun(
    db: SqlExecutor,
    params: {
      scrapeRunId: string;
      startedAt: string;
      githubRunId: string | null;
    },
  ) {
    await db.execute({
      sql: `
        UPDATE scrape_runs
        SET github_run_id = ?,
            status = 'running',
            started_at = ?,
            finished_at = NULL,
            inserted_count = 0,
            updated_count = 0,
            skipped_count = 0,
            error_count = 0,
            error_message = NULL
        WHERE id = ?
      `,
      args: [params.githubRunId, params.startedAt, params.scrapeRunId],
    });
  }

  async completeScrapeRun(
    db: SqlExecutor,
    scrapeRunId: string,
    status: "completed" | "failed",
    counts: BatchRunCounts,
    finishedAt: string,
    errorMessage: string | null,
  ) {
    await db.execute({
      sql: `
        UPDATE scrape_runs
        SET status = ?,
            finished_at = ?,
            inserted_count = ?,
            updated_count = ?,
            skipped_count = ?,
            error_count = ?,
            error_message = ?
        WHERE id = ?
      `,
      args: [
        status,
        finishedAt,
        counts.inserted,
        counts.updated,
        counts.skipped,
        counts.errors,
        errorMessage,
        scrapeRunId,
      ],
    });
  }

  async findClinicSource(db: SqlExecutor, sourceName: string, externalKey: string) {
    const result = await db.execute({
      sql: `
        SELECT id, clinic_id
        FROM clinic_sources
        WHERE source_name = ? AND external_key = ?
        LIMIT 1
      `,
      args: [sourceName, externalKey],
    });

    return result.rows[0] ?? null;
  }

  async findClinicCandidate(
    db: SqlExecutor,
    normalizedName: string,
    normalizedAddress: string,
    city: string,
  ) {
    let result = await db.execute({
      sql: `
        SELECT id, is_hidden, opt_out
        FROM clinics
        WHERE normalized_name = ?
          AND coalesce(normalized_address, '') = ?
          AND city = ?
        LIMIT 1
      `,
      args: [normalizedName, normalizedAddress, city],
    });

    if (result.rows[0]) {
      return result.rows[0];
    }

    result = await db.execute({
      sql: `
        SELECT id, is_hidden, opt_out
        FROM clinics
        WHERE normalized_name = ?
          AND city = ?
        LIMIT 1
      `,
      args: [normalizedName, city],
    });

    return result.rows[0] ?? null;
  }

  async findClinicLooseCandidates(
    db: SqlExecutor,
    args: {
      city: string;
      normalizedAddress: string | null;
      tokenHints: string[];
    },
  ) {
    const signalClauses: string[] = [];
    const sqlArgs: Array<string> = [args.city];

    if (args.normalizedAddress) {
      signalClauses.push("coalesce(normalized_address, '') = ?");
      sqlArgs.push(args.normalizedAddress);
    }

    const tokenHints = args.tokenHints.slice(0, 3);
    if (tokenHints.length > 0) {
      const tokenClauses = tokenHints.map(() => "normalized_name LIKE ?");
      signalClauses.push(`(${tokenClauses.join(" OR ")})`);
      for (const token of tokenHints) {
        sqlArgs.push(`%${token}%`);
      }
    }

    if (signalClauses.length === 0) {
      return [];
    }

    const result = await db.execute({
      sql: `
        SELECT id, name, normalized_name, normalized_address, site_url, is_hidden, opt_out
        FROM clinics
        WHERE city = ?
          AND (${signalClauses.join(" OR ")})
        LIMIT 25
      `,
      args: sqlArgs,
    });

    return result.rows;
  }

  async insertClinic(
    db: SqlExecutor,
    args: {
      id: string;
      slug: string;
      name: string;
      normalizedName: string;
      normalizedAddress: string | null;
      city: string;
      address: string | null;
      siteUrl: string | null;
      bookingUrlOfficial: string | null;
      officialDirectoryUrl: string | null;
      officialBookingWidgetUrl: string | null;
      verificationStatus: string;
      officialLastVerifiedAt: string | null;
      officialVerificationNotes: string | null;
      hasOnlineBooking: number;
      suppressionKey: string;
      nowIso: string;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO clinics (
          id, slug, name, normalized_name, normalized_address, city, address,
          site_url, booking_url_official, official_directory_url, official_booking_widget_url,
          verification_status, official_last_verified_at, official_verification_notes,
          has_online_booking, is_hidden, opt_out, suppression_key,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
      `,
      args: [
        args.id,
        args.slug,
        args.name,
        args.normalizedName,
        args.normalizedAddress,
        args.city,
        args.address,
        args.siteUrl,
        args.bookingUrlOfficial,
        args.officialDirectoryUrl,
        args.officialBookingWidgetUrl,
        args.verificationStatus,
        args.officialLastVerifiedAt,
        args.officialVerificationNotes,
        args.hasOnlineBooking,
        args.suppressionKey,
        args.nowIso,
        args.nowIso,
      ],
    });
  }

  async touchClinic(
    db: SqlExecutor,
    args: {
      clinicId: string;
      name: string;
      normalizedName: string;
      normalizedAddress: string | null;
      address: string | null;
      siteUrl: string | null;
      bookingUrlOfficial: string | null;
      officialDirectoryUrl: string | null;
      officialBookingWidgetUrl: string | null;
      verificationStatus: string;
      officialLastVerifiedAt: string | null;
      officialVerificationNotes: string | null;
      isOfficial: number;
      hasOnlineBooking: number;
      nowIso: string;
    },
  ) {
    await db.execute({
      sql: `
        UPDATE clinics
        SET name = ?,
            normalized_name = ?,
            normalized_address = ?,
            address = coalesce(?, address),
            site_url = CASE
              WHEN ? = 1 THEN coalesce(?, site_url)
              WHEN site_url IS NULL THEN ?
              WHEN site_url = 'https://ydoc.by/minsk/klinika/' AND ? IS NOT NULL THEN ?
              WHEN site_url LIKE 'https://ydoc.by/%' AND ? IS NOT NULL AND ? NOT LIKE 'https://ydoc.by/%' THEN ?
              ELSE site_url
            END,
            booking_url_official = CASE
              WHEN ? = 1 THEN coalesce(?, booking_url_official)
              ELSE booking_url_official
            END,
            official_directory_url = CASE
              WHEN ? = 1 THEN coalesce(?, official_directory_url)
              ELSE official_directory_url
            END,
            official_booking_widget_url = CASE
              WHEN ? = 1 THEN coalesce(?, official_booking_widget_url)
              ELSE official_booking_widget_url
            END,
            verification_status = CASE
              WHEN ? = 1 AND ? <> 'unverified' THEN ?
              WHEN verification_status = 'unverified' THEN ?
              ELSE verification_status
            END,
            official_last_verified_at = CASE
              WHEN ? = 1 THEN coalesce(?, official_last_verified_at)
              ELSE official_last_verified_at
            END,
            official_verification_notes = CASE
              WHEN ? = 1 THEN coalesce(?, official_verification_notes)
              WHEN official_verification_notes IS NULL THEN ?
              ELSE official_verification_notes
            END,
            has_online_booking = CASE
              WHEN has_online_booking = 1 THEN 1
              ELSE ?
            END,
            updated_at = ?
        WHERE id = ?
      `,
      args: [
        args.name,
        args.normalizedName,
        args.normalizedAddress,
        args.address,
        args.isOfficial,
        args.siteUrl,
        args.siteUrl,
        args.siteUrl,
        args.siteUrl,
        args.siteUrl,
        args.siteUrl,
        args.siteUrl,
        args.isOfficial,
        args.bookingUrlOfficial,
        args.isOfficial,
        args.officialDirectoryUrl,
        args.isOfficial,
        args.officialBookingWidgetUrl,
        args.isOfficial,
        args.verificationStatus,
        args.verificationStatus,
        args.verificationStatus,
        args.isOfficial,
        args.officialLastVerifiedAt,
        args.isOfficial,
        args.officialVerificationNotes,
        args.officialVerificationNotes,
        args.hasOnlineBooking,
        args.nowIso,
        args.clinicId,
      ],
    });
  }

  async upsertClinicSource(
    db: SqlExecutor,
    args: {
      id: string;
      clinicId: string;
      sourceName: string;
      externalKey: string;
      sourceUrl: string;
      sourceType: string;
      isOfficial: number;
      sourcePriority: number;
      checksum: string;
      lastSeenAt: string;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO clinic_sources (
          id, clinic_id, source_name, external_key, source_url,
          source_type, is_official, source_priority, checksum, last_seen_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_name, external_key) DO UPDATE SET
          clinic_id = excluded.clinic_id,
          source_url = excluded.source_url,
          source_type = excluded.source_type,
          is_official = CASE
            WHEN excluded.is_official = 1 THEN 1
            ELSE clinic_sources.is_official
          END,
          source_priority = CASE
            WHEN excluded.source_priority < clinic_sources.source_priority
              THEN excluded.source_priority
            ELSE clinic_sources.source_priority
          END,
          checksum = excluded.checksum,
          last_seen_at = excluded.last_seen_at
      `,
      args: [
        args.id,
        args.clinicId,
        args.sourceName,
        args.externalKey,
        args.sourceUrl,
        args.sourceType,
        args.isOfficial,
        args.sourcePriority,
        args.checksum,
        args.lastSeenAt,
      ],
    });
  }

  async findDoctorSource(db: SqlExecutor, sourceName: string, externalKey: string) {
    const result = await db.execute({
      sql: `
        SELECT id, doctor_id, clinic_id
        FROM doctor_sources
        WHERE source_name = ? AND external_key = ?
        LIMIT 1
      `,
      args: [sourceName, externalKey],
    });

    return result.rows[0] ?? null;
  }

  async findDoctorCandidates(db: SqlExecutor, normalizedName: string) {
    const result = await db.execute({
      sql: `
        SELECT d.id,
               d.slug,
               d.is_hidden,
               d.opt_out,
               group_concat(DISTINCT ds.specialty_id) AS specialty_ids,
               group_concat(DISTINCT s.normalized_name) AS specialty_names,
               group_concat(DISTINCT dc.clinic_id) AS clinic_ids,
               COUNT(DISTINCT dsrc.id) AS source_count
        FROM doctors d
        LEFT JOIN doctor_specialties ds ON ds.doctor_id = d.id
        LEFT JOIN specialties s ON s.id = ds.specialty_id
        LEFT JOIN doctor_clinics dc ON dc.doctor_id = d.id AND dc.is_active = 1
        LEFT JOIN doctor_sources dsrc ON dsrc.doctor_id = d.id
        WHERE d.normalized_name = ?
        GROUP BY d.id, d.slug, d.is_hidden, d.opt_out
      `,
      args: [normalizedName],
    });

    return result.rows;
  }

  async insertDoctor(
    db: SqlExecutor,
    args: {
      id: string;
      slug: string;
      fullName: string;
      normalizedName: string;
      suppressionKey: string;
      nowIso: string;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO doctors (
          id, slug, full_name, normalized_name, is_hidden, opt_out, suppression_key,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?)
      `,
      args: [
        args.id,
        args.slug,
        args.fullName,
        args.normalizedName,
        args.suppressionKey,
        args.nowIso,
        args.nowIso,
      ],
    });
  }

  async touchDoctor(
    db: SqlExecutor,
    args: {
      doctorId: string;
      fullName: string;
      normalizedName: string;
      nowIso: string;
    },
  ) {
    await db.execute({
      sql: `
        UPDATE doctors
        SET full_name = ?,
            normalized_name = ?,
            updated_at = ?
        WHERE id = ?
      `,
      args: [args.fullName, args.normalizedName, args.nowIso, args.doctorId],
    });
  }

  async upsertDoctorSource(
    db: SqlExecutor,
    args: {
      id: string;
      doctorId: string;
      clinicId: string | null;
      sourceName: string;
      externalKey: string;
      sourceUrl: string;
      bookingUrl: string | null;
      profileUrl: string | null;
      officialProfileUrl: string | null;
      sourceType: string;
      verificationStatus: string;
      verifiedOnClinicSite: number;
      lastVerifiedAt: string | null;
      confidenceScore: number;
      checksum: string;
      lastSeenAt: string;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO doctor_sources (
          id, doctor_id, clinic_id, source_name, external_key,
          source_url, booking_url, checksum, last_seen_at, source_type,
          profile_url, official_profile_url, verification_status,
          verified_on_clinic_site, last_verified_at, confidence_score
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_name, external_key) DO UPDATE SET
          doctor_id = excluded.doctor_id,
          clinic_id = excluded.clinic_id,
          source_url = excluded.source_url,
          booking_url = CASE
            WHEN excluded.verified_on_clinic_site = 1 THEN coalesce(excluded.booking_url, doctor_sources.booking_url)
            ELSE coalesce(doctor_sources.booking_url, excluded.booking_url)
          END,
          source_type = CASE
            WHEN excluded.verified_on_clinic_site = 1 THEN excluded.source_type
            ELSE doctor_sources.source_type
          END,
          profile_url = coalesce(excluded.profile_url, doctor_sources.profile_url),
          official_profile_url = coalesce(excluded.official_profile_url, doctor_sources.official_profile_url),
          verification_status = CASE
            WHEN excluded.verified_on_clinic_site = 1 THEN excluded.verification_status
            WHEN doctor_sources.verified_on_clinic_site = 1 THEN doctor_sources.verification_status
            ELSE excluded.verification_status
          END,
          verified_on_clinic_site = CASE
            WHEN doctor_sources.verified_on_clinic_site = 1 OR excluded.verified_on_clinic_site = 1
              THEN 1
            ELSE 0
          END,
          last_verified_at = coalesce(excluded.last_verified_at, doctor_sources.last_verified_at),
          confidence_score = CASE
            WHEN excluded.confidence_score > doctor_sources.confidence_score
              THEN excluded.confidence_score
            ELSE doctor_sources.confidence_score
          END,
          checksum = excluded.checksum,
          last_seen_at = excluded.last_seen_at
      `,
      args: [
        args.id,
        args.doctorId,
        args.clinicId,
        args.sourceName,
        args.externalKey,
        args.sourceUrl,
        args.bookingUrl,
        args.checksum,
        args.lastSeenAt,
        args.sourceType,
        args.profileUrl,
        args.officialProfileUrl,
        args.verificationStatus,
        args.verifiedOnClinicSite,
        args.lastVerifiedAt,
        args.confidenceScore,
      ],
    });
  }

  async findSpecialtyByNormalizedName(db: SqlExecutor, normalizedName: string) {
    const result = await db.execute({
      sql: `
        SELECT id, slug, name
        FROM specialties
        WHERE normalized_name = ?
        LIMIT 1
      `,
      args: [normalizedName],
    });

    return result.rows[0] ?? null;
  }

  async insertSpecialty(
    db: SqlExecutor,
    args: {
      id: string;
      slug: string;
      name: string;
      normalizedName: string;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO specialties (
          id, slug, name, normalized_name, synonyms_json, sort_order
        )
        VALUES (?, ?, ?, ?, NULL, 0)
      `,
      args: [args.id, args.slug, args.name, args.normalizedName],
    });
  }

  async upsertDoctorSpecialty(
    db: SqlExecutor,
    args: {
      doctorId: string;
      specialtyId: string;
      isPrimary: number;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO doctor_specialties (
          doctor_id, specialty_id, is_primary, source_count, created_at
        )
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(doctor_id, specialty_id) DO UPDATE SET
          is_primary = CASE
            WHEN excluded.is_primary = 1 THEN 1
            ELSE doctor_specialties.is_primary
          END,
          source_count = doctor_specialties.source_count + 1
      `,
      args: [args.doctorId, args.specialtyId, args.isPrimary],
    });
  }

  async upsertDoctorClinic(
    db: SqlExecutor,
    args: {
      id: string;
      relationKey: string;
      doctorId: string;
      clinicId: string;
      bookingUrl: string | null;
      profileUrl: string | null;
      positionTitle: string | null;
      sourceType: string;
      relationSourceUrl: string | null;
      officialProfileUrl: string | null;
      officialBookingUrl: string | null;
      aggregatorProfileUrl: string | null;
      aggregatorBookingUrl: string | null;
      verifiedOnClinicSite: number;
      verificationStatus: string;
      lastVerifiedAt: string | null;
      confidenceScore: number;
      lastSeenAt: string;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO doctor_clinics (
          id, relation_key, doctor_id, clinic_id, booking_url, profile_url,
          position_title, is_active, last_seen_at, created_at, updated_at,
          source_type, relation_source_url, official_profile_url, official_booking_url,
          aggregator_profile_url, aggregator_booking_url, verified_on_clinic_site,
          verification_status, last_verified_at, confidence_score
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(relation_key) DO UPDATE SET
          booking_url = CASE
            WHEN excluded.verified_on_clinic_site = 1 THEN coalesce(excluded.official_booking_url, excluded.booking_url, doctor_clinics.booking_url)
            ELSE coalesce(doctor_clinics.booking_url, excluded.booking_url, excluded.aggregator_booking_url)
          END,
          profile_url = CASE
            WHEN excluded.verified_on_clinic_site = 1 THEN coalesce(excluded.official_profile_url, excluded.profile_url, doctor_clinics.profile_url)
            ELSE coalesce(doctor_clinics.profile_url, excluded.profile_url, excluded.aggregator_profile_url)
          END,
          position_title = coalesce(excluded.position_title, doctor_clinics.position_title),
          is_active = 1,
          source_type = CASE
            WHEN excluded.verified_on_clinic_site = 1 THEN excluded.source_type
            ELSE doctor_clinics.source_type
          END,
          relation_source_url = coalesce(excluded.relation_source_url, doctor_clinics.relation_source_url),
          official_profile_url = coalesce(excluded.official_profile_url, doctor_clinics.official_profile_url),
          official_booking_url = coalesce(excluded.official_booking_url, doctor_clinics.official_booking_url),
          aggregator_profile_url = coalesce(excluded.aggregator_profile_url, doctor_clinics.aggregator_profile_url),
          aggregator_booking_url = coalesce(excluded.aggregator_booking_url, doctor_clinics.aggregator_booking_url),
          verified_on_clinic_site = CASE
            WHEN doctor_clinics.verified_on_clinic_site = 1 OR excluded.verified_on_clinic_site = 1
              THEN 1
            ELSE 0
          END,
          verification_status = CASE
            WHEN excluded.verified_on_clinic_site = 1 THEN excluded.verification_status
            WHEN doctor_clinics.verified_on_clinic_site = 1 THEN doctor_clinics.verification_status
            ELSE excluded.verification_status
          END,
          last_verified_at = coalesce(excluded.last_verified_at, doctor_clinics.last_verified_at),
          confidence_score = CASE
            WHEN excluded.confidence_score > doctor_clinics.confidence_score
              THEN excluded.confidence_score
            ELSE doctor_clinics.confidence_score
          END,
          last_seen_at = excluded.last_seen_at,
          updated_at = excluded.updated_at
      `,
      args: [
        args.id,
        args.relationKey,
        args.doctorId,
        args.clinicId,
        args.bookingUrl,
        args.profileUrl,
        args.positionTitle,
        args.lastSeenAt,
        args.lastSeenAt,
        args.lastSeenAt,
        args.sourceType,
        args.relationSourceUrl,
        args.officialProfileUrl,
        args.officialBookingUrl,
        args.aggregatorProfileUrl,
        args.aggregatorBookingUrl,
        args.verifiedOnClinicSite,
        args.verificationStatus,
        args.lastVerifiedAt,
        args.confidenceScore,
      ],
    });
  }

  async upsertReviewSummary(
    db: SqlExecutor,
    args: {
      id: string;
      scopeKey: string;
      doctorId: string | null;
      clinicId: string | null;
      doctorClinicId: string | null;
      sourceName: string;
      sourcePageUrl: string;
      ratingAvg: number | null;
      reviewsCount: number;
      capturedAt: string;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO reviews_summary (
          id, scope_key, doctor_id, clinic_id, doctor_clinic_id,
          source_name, source_page_url, rating_avg, reviews_count,
          last_review_at, captured_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
        ON CONFLICT(scope_key) DO UPDATE SET
          doctor_id = excluded.doctor_id,
          clinic_id = excluded.clinic_id,
          doctor_clinic_id = excluded.doctor_clinic_id,
          source_page_url = excluded.source_page_url,
          rating_avg = excluded.rating_avg,
          reviews_count = excluded.reviews_count,
          captured_at = excluded.captured_at,
          updated_at = excluded.updated_at
      `,
      args: [
        args.id,
        args.scopeKey,
        args.doctorId,
        args.clinicId,
        args.doctorClinicId,
        args.sourceName,
        args.sourcePageUrl,
        args.ratingAvg,
        args.reviewsCount,
        args.capturedAt,
        args.capturedAt,
        args.capturedAt,
      ],
    });
  }

  async findPromotionByFingerprint(db: SqlExecutor, fingerprintHash: string) {
    const result = await db.execute({
      sql: `
        SELECT id, title, source_url, discount_label, ends_at
        FROM promotions
        WHERE fingerprint_hash = ?
        LIMIT 1
      `,
      args: [fingerprintHash],
    });

    return result.rows[0] ?? null;
  }

  async upsertPromotion(
    db: SqlExecutor,
    args: {
      id: string;
      clinicId: string;
      doctorId: string | null;
      title: string;
      sourceName: string;
      sourceUrl: string;
      endsAt: string | null;
      fingerprintHash: string;
      lastSeenAt: string;
      isActive: number;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO promotions (
          id, clinic_id, doctor_id, title, description_short, source_name, source_url,
          discount_label, starts_at, ends_at, is_active, is_hidden,
          fingerprint_hash, last_seen_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, NULL, ?, ?, 0, ?, ?, ?, ?)
        ON CONFLICT(fingerprint_hash) DO UPDATE SET
          clinic_id = excluded.clinic_id,
          doctor_id = excluded.doctor_id,
          title = excluded.title,
          source_url = excluded.source_url,
          ends_at = excluded.ends_at,
          is_active = excluded.is_active,
          last_seen_at = excluded.last_seen_at,
          updated_at = excluded.updated_at
      `,
      args: [
        args.id,
        args.clinicId,
        args.doctorId,
        args.title,
        args.sourceName,
        args.sourceUrl,
        args.endsAt,
        args.isActive,
        args.fingerprintHash,
        args.lastSeenAt,
        args.lastSeenAt,
        args.lastSeenAt,
      ],
    });
  }

  async insertOutboxIfMissing(
    db: SqlExecutor,
    args: {
      id: string;
      entityId: string;
      dedupeKey: string;
      payloadJson: string;
      createdAt: string;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO notification_outbox (
          id, event_type, entity_type, entity_id, dedupe_key,
          payload_json, status, attempt_count, last_error, created_at, sent_at
        )
        VALUES (?, 'promotion.updated', 'promotion', ?, ?, ?, 'pending', 0, NULL, ?, NULL)
        ON CONFLICT(dedupe_key) DO NOTHING
      `,
      args: [
        args.id,
        args.entityId,
        args.dedupeKey,
        args.payloadJson,
        args.createdAt,
      ],
    });
  }
}
