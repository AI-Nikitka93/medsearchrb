import type { Client } from "@libsql/client/web";

import {
  DoctorsReadRepository,
  type DoctorListFilters,
} from "../repositories/doctors-read-repository";

export class DoctorsService {
  constructor(private readonly repo = new DoctorsReadRepository()) {}

  async list(client: Client, filters: DoctorListFilters) {
    const result = await this.repo.list(client, filters);

    return {
      total: result.total,
      page: filters.page,
      per_page: filters.perPage,
      items: result.rows.map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        full_name: String(row.full_name),
        specialties: String(row.specialties_csv ?? "")
          .split(",")
          .filter(Boolean),
        clinics: String(row.clinics_csv ?? "")
          .split(",")
          .filter(Boolean),
        rating_avg: row.rating_avg === null ? null : Number(row.rating_avg),
        reviews_count: row.reviews_count === null ? 0 : Number(row.reviews_count),
        promo_title: row.promo_title ? String(row.promo_title) : null,
      })),
    };
  }

  async getById(client: Client, doctorIdOrSlug: string) {
    const doctor = await this.repo.getByIdOrSlug(client, doctorIdOrSlug);
    if (!doctor) {
      return null;
    }

    const doctorId = String(doctor.id);
    const [specialties, clinics, reviews, promotions] = await Promise.all([
      this.repo.getSpecialties(client, doctorId),
      this.repo.getClinics(client, doctorId),
      this.repo.getReviews(client, doctorId),
      this.repo.getPromotions(client, doctorId),
    ]);

    const aggregatedReview = reviews.reduce(
      (acc, item) => {
        const reviewsCount = Number(item.reviews_count ?? 0);
        const ratingAvg =
          item.rating_avg === null || item.rating_avg === undefined
            ? null
            : Number(item.rating_avg);

        acc.reviewsCount += reviewsCount;
        if (ratingAvg !== null && reviewsCount > 0) {
          acc.weightedScore += ratingAvg * reviewsCount;
          acc.weightedCount += reviewsCount;
        } else if (ratingAvg !== null) {
          acc.fallbackRatings.push(ratingAvg);
        }

        return acc;
      },
      {
        weightedScore: 0,
        weightedCount: 0,
        reviewsCount: 0,
        fallbackRatings: [] as number[],
      },
    );

    const ratingAvg =
      aggregatedReview.weightedCount > 0
        ? Number(
            (
              aggregatedReview.weightedScore /
              aggregatedReview.weightedCount
            ).toFixed(1),
          )
        : aggregatedReview.fallbackRatings.length > 0
          ? Math.max(...aggregatedReview.fallbackRatings)
          : null;

    return {
      id: doctorId,
      slug: String(doctor.slug),
      full_name: String(doctor.full_name),
      description_short: doctor.description_short ? String(doctor.description_short) : null,
      rating_avg: ratingAvg,
      reviews_count: aggregatedReview.reviewsCount,
      specialties: specialties.map((item) => ({
        id: String(item.id),
        slug: String(item.slug),
        name: String(item.name),
        is_primary: Number(item.is_primary ?? 0) === 1,
      })),
      clinics: clinics.map((item) => ({
        id: String(item.clinic_id),
        slug: String(item.clinic_slug),
        name: String(item.clinic_name),
        address: item.address ? String(item.address) : null,
        site_url: item.site_url ? String(item.site_url) : null,
        booking_url: item.booking_url ? String(item.booking_url) : null,
        profile_url: item.profile_url ? String(item.profile_url) : null,
        official_booking_url: item.official_booking_url
          ? String(item.official_booking_url)
          : null,
        official_profile_url: item.official_profile_url
          ? String(item.official_profile_url)
          : null,
        aggregator_booking_url: item.aggregator_booking_url
          ? String(item.aggregator_booking_url)
          : null,
        aggregator_profile_url: item.aggregator_profile_url
          ? String(item.aggregator_profile_url)
          : null,
        verification_status: item.verification_status
          ? String(item.verification_status)
          : "aggregator_only",
        verified_on_clinic_site:
          Number(item.verified_on_clinic_site ?? 0) === 1,
        last_verified_at: item.last_verified_at
          ? String(item.last_verified_at)
          : null,
      })),
      reviews: reviews.map((item) => ({
        source_name: String(item.source_name),
        source_page_url: String(item.source_page_url),
        rating_avg: item.rating_avg === null ? null : Number(item.rating_avg),
        reviews_count: Number(item.reviews_count ?? 0),
        captured_at: String(item.captured_at),
      })),
      promotions: promotions.map((item) => ({
        id: String(item.id),
        title: String(item.title),
        source_url: String(item.source_url),
        ends_at: item.ends_at ? String(item.ends_at) : null,
        clinic: {
          id: String(item.clinic_id),
          slug: String(item.clinic_slug),
          name: String(item.clinic_name),
        },
      })),
    };
  }
}
