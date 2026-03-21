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
      hasOnlineBooking: number;
      suppressionKey: string;
      nowIso: string;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO clinics (
          id, slug, name, normalized_name, normalized_address, city, address,
          site_url, has_online_booking, is_hidden, opt_out, suppression_key,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
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
            site_url = coalesce(?, site_url),
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
        args.siteUrl,
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
      checksum: string;
      lastSeenAt: string;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO clinic_sources (
          id, clinic_id, source_name, external_key, source_url, checksum, last_seen_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_name, external_key) DO UPDATE SET
          clinic_id = excluded.clinic_id,
          source_url = excluded.source_url,
          checksum = excluded.checksum,
          last_seen_at = excluded.last_seen_at
      `,
      args: [
        args.id,
        args.clinicId,
        args.sourceName,
        args.externalKey,
        args.sourceUrl,
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
               group_concat(DISTINCT dc.clinic_id) AS clinic_ids
        FROM doctors d
        LEFT JOIN doctor_specialties ds ON ds.doctor_id = d.id
        LEFT JOIN doctor_clinics dc ON dc.doctor_id = d.id AND dc.is_active = 1
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
      checksum: string;
      lastSeenAt: string;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO doctor_sources (
          id, doctor_id, clinic_id, source_name, external_key,
          source_url, booking_url, checksum, last_seen_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_name, external_key) DO UPDATE SET
          doctor_id = excluded.doctor_id,
          clinic_id = excluded.clinic_id,
          source_url = excluded.source_url,
          booking_url = excluded.booking_url,
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
      lastSeenAt: string;
    },
  ) {
    await db.execute({
      sql: `
        INSERT INTO doctor_clinics (
          id, relation_key, doctor_id, clinic_id, booking_url, profile_url,
          position_title, is_active, last_seen_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, NULL, 1, ?, ?, ?)
        ON CONFLICT(relation_key) DO UPDATE SET
          booking_url = excluded.booking_url,
          profile_url = excluded.profile_url,
          is_active = 1,
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
        args.lastSeenAt,
        args.lastSeenAt,
        args.lastSeenAt,
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
