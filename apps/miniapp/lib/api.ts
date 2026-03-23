const LOCAL_API_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_API_BASE_URL = "https://medsearchrb-api.aiomdurman.workers.dev";
const SNAPSHOT_PATH = `${process.env.NEXT_PUBLIC_BASE_PATH?.trim() || ""}/data/catalog.json`;
const OVERVIEW_SNAPSHOT_PATH = `${process.env.NEXT_PUBLIC_BASE_PATH?.trim() || ""}/data/catalog-overview.json`;

type DoctorSpecialty = {
  id: string;
  slug: string;
  name: string;
  is_primary: boolean;
};

type DoctorClinic = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  site_url: string | null;
  booking_url: string | null;
  profile_url: string | null;
  official_booking_url?: string | null;
  official_profile_url?: string | null;
  aggregator_booking_url?: string | null;
  aggregator_profile_url?: string | null;
  verification_status?: string | null;
  verified_on_clinic_site?: boolean;
  last_verified_at?: string | null;
};

type DoctorReview = {
  source_name: string;
  source_page_url: string;
  rating_avg: number | null;
  reviews_count: number;
  captured_at: string;
};

type DoctorPromotion = {
  id: string;
  title: string;
  source_url: string;
  ends_at: string | null;
  clinic: {
    id: string;
    slug: string;
    name: string;
  };
};

export type DoctorsListItem = {
  id: string;
  slug: string;
  full_name: string;
  specialties: string[];
  clinics: string[];
  rating_avg: number | null;
  reviews_count: number;
  promo_title: string | null;
};

export type DoctorsListResponse = {
  total: number;
  page: number;
  per_page: number;
  items: DoctorsListItem[];
};

export type DoctorDetailResponse = {
  item: {
    id: string;
    slug: string;
    full_name: string;
    description_short: string | null;
    rating_avg?: number | null;
    reviews_count?: number;
    specialties: DoctorSpecialty[];
    clinics: DoctorClinic[];
    reviews: DoctorReview[];
    promotions: DoctorPromotion[];
  };
};

export type PromotionListResponse = {
  total: number;
  page: number;
  per_page: number;
  items: Array<{
    id: string;
    title: string;
    source_url: string;
    ends_at: string | null;
    clinic: {
      id: string;
      slug: string;
      name: string;
    };
    doctor: {
      id: string;
      slug: string;
      full_name: string;
    } | null;
  }>;
};

export type CatalogOverview = {
  generated_at: string | null;
  doctors_total: number;
  promotions_total: number;
  clinics_total: number;
  specialties: Array<{
    slug: string;
    name: string;
    count: number;
  }>;
};

type CatalogSnapshot = {
  generated_at: string;
  doctors: Array<{
    id: string;
    slug: string;
    full_name: string;
    description_short: string | null;
    rating_avg: number | null;
    reviews_count: number;
    specialties: DoctorSpecialty[];
    clinics: DoctorClinic[];
    reviews: DoctorReview[];
    promotions: DoctorPromotion[];
  }>;
  promotions: PromotionListResponse["items"];
};

type QueryValue = string | number | undefined | null;
type DataSourcePreference = "worker" | "snapshot";

let catalogSnapshotPromise: Promise<CatalogSnapshot> | null = null;
let overviewSnapshotPromise: Promise<CatalogOverview> | null = null;
const WORKER_TIMEOUT_MS = 2500;

function resolveApiBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return LOCAL_API_BASE_URL;
    }
  }

  return DEFAULT_API_BASE_URL;
}

function resolveSourceOrder(): DataSourcePreference[] {
  return isLocalHost() ? ["worker", "snapshot"] : ["snapshot", "worker"];
}

function resolveDoctorDetailSourceOrder(): DataSourcePreference[] {
  return resolveSourceOrder();
}

function isLocalHost() {
  if (typeof window === "undefined") {
    return false;
  }

  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function withQuery(path: string, query: Record<string, QueryValue>) {
  const baseUrl = resolveApiBaseUrl();
  if (!baseUrl) {
    throw new Error("API base URL is not configured");
  }

  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/\s+/g, " ");
}

function compareByDoctorPriority(
  left: { full_name: string; reviews_count: number },
  right: { full_name: string; reviews_count: number },
) {
  if (right.reviews_count !== left.reviews_count) {
    return right.reviews_count - left.reviews_count;
  }

  return left.full_name.localeCompare(right.full_name, "ru");
}

function paginate<T>(items: T[], page: number, perPage: number) {
  const start = Math.max(page - 1, 0) * perPage;
  return items.slice(start, start + perPage);
}

function buildCatalogOverview(snapshot: CatalogSnapshot): CatalogOverview {
  const clinicIds = new Set<string>();
  const specialtyMap = new Map<
    string,
    {
      slug: string;
      name: string;
      count: number;
    }
  >();

  for (const doctor of snapshot.doctors) {
    for (const clinic of doctor.clinics) {
      clinicIds.add(clinic.id);
    }

    for (const specialty of doctor.specialties) {
      const key = specialty.slug || normalizeText(specialty.name);
      const current = specialtyMap.get(key);

      if (current) {
        current.count += 1;
        continue;
      }

      specialtyMap.set(key, {
        slug: specialty.slug || key,
        name: specialty.name,
        count: 1,
      });
    }
  }

  return {
    generated_at: snapshot.generated_at,
    doctors_total: snapshot.doctors.length,
    promotions_total: snapshot.promotions.length,
    clinics_total: clinicIds.size,
    specialties: Array.from(specialtyMap.values()).sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.name.localeCompare(right.name, "ru");
    }),
  };
}

async function loadOverviewSnapshot() {
  if (!overviewSnapshotPromise) {
    overviewSnapshotPromise = fetch(OVERVIEW_SNAPSHOT_PATH, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Overview snapshot HTTP ${response.status}`);
        }

        return (await response.json()) as CatalogOverview;
      })
      .catch((error) => {
        overviewSnapshotPromise = null;
        throw error;
      });
  }

  return overviewSnapshotPromise;
}

async function loadCatalogSnapshot() {
  if (!catalogSnapshotPromise) {
    catalogSnapshotPromise = fetch(SNAPSHOT_PATH, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Snapshot HTTP ${response.status}`);
        }

        return (await response.json()) as CatalogSnapshot;
      })
      .catch((error) => {
        catalogSnapshotPromise = null;
        throw error;
      });
  }

  return catalogSnapshotPromise;
}

async function tryWorkerJson<T>(
  path: string,
  query: Record<string, QueryValue>,
  init?: RequestInit,
): Promise<T> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error("worker_timeout"));
  }, WORKER_TIMEOUT_MS);

  const mergedSignal = init?.signal
    ? AbortSignal.any([init.signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    return await fetchJson<T>(path, query, {
      ...init,
      signal: mergedSignal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchJson<T>(
  path: string,
  query: Record<string, QueryValue>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(withQuery(path, query), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;

    try {
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      message = payload.error?.message ?? message;
    } catch {
      // Keep HTTP fallback when the API does not return JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function fetchDoctorsFromSnapshot(params: {
  q?: string;
  specialty?: string;
  clinic?: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<DoctorsListResponse> {
  const snapshot = await loadCatalogSnapshot();
  const normalizedQuery = params.q ? normalizeText(params.q) : null;
  const normalizedSpecialty = params.specialty ? normalizeText(params.specialty) : null;
  const normalizedClinic = params.clinic ? normalizeText(params.clinic) : null;

  const filteredDoctors = snapshot.doctors
    .filter((doctor) => {
      if (normalizedQuery) {
        const haystack = normalizeText(
          [
            doctor.full_name,
            doctor.description_short ?? "",
            ...doctor.specialties.map((item) => item.name),
            ...doctor.clinics.map((item) => item.name),
          ].join(" "),
        );

        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      if (
        normalizedSpecialty &&
        !doctor.specialties.some(
          (item) =>
            item.slug === normalizedSpecialty ||
            normalizeText(item.name) === normalizedSpecialty,
        )
      ) {
        return false;
      }

      if (
        normalizedClinic &&
        !doctor.clinics.some(
          (item) =>
            item.slug === normalizedClinic ||
            normalizeText(item.name) === normalizedClinic,
        )
      ) {
        return false;
      }

      return true;
    })
    .sort(compareByDoctorPriority);

  const page = params.page ?? 1;
  const perPage = params.perPage ?? 20;

  return {
    total: filteredDoctors.length,
    page,
    per_page: perPage,
    items: paginate(filteredDoctors, page, perPage).map((doctor) => ({
      id: doctor.id,
      slug: doctor.slug,
      full_name: doctor.full_name,
      specialties: doctor.specialties.map((item) => item.name),
      clinics: doctor.clinics.map((item) => item.name),
      rating_avg: doctor.rating_avg,
      reviews_count: doctor.reviews_count,
      promo_title: doctor.promotions[0]?.title ?? null,
    })),
  };
}

async function fetchDoctorDetailFromSnapshot(
  doctorId: string,
): Promise<DoctorDetailResponse> {
  const snapshot = await loadCatalogSnapshot();
  const doctor = snapshot.doctors.find(
    (item) => item.id === doctorId || item.slug === doctorId,
  );

  if (!doctor) {
    throw new Error("doctor not found");
  }

  return {
    item: {
      id: doctor.id,
      slug: doctor.slug,
      full_name: doctor.full_name,
      description_short: doctor.description_short,
      rating_avg: doctor.rating_avg,
      reviews_count: doctor.reviews_count,
      specialties: doctor.specialties,
      clinics: doctor.clinics,
      reviews: doctor.reviews,
      promotions: doctor.promotions,
    },
  };
}

async function fetchPromotionsFromSnapshot(params?: {
  clinic?: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<PromotionListResponse> {
  const snapshot = await loadCatalogSnapshot();
  const normalizedClinic = params?.clinic ? normalizeText(params.clinic) : null;
  const filteredPromotions = snapshot.promotions.filter((promotion) => {
    if (!normalizedClinic) {
      return true;
    }

    return (
      promotion.clinic.slug === normalizedClinic ||
      normalizeText(promotion.clinic.name) === normalizedClinic
    );
  });

  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 10;

  return {
    total: filteredPromotions.length,
    page,
    per_page: perPage,
    items: paginate(filteredPromotions, page, perPage),
  };
}

export async function fetchDoctors(params: {
  q?: string;
  specialty?: string;
  clinic?: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}) {
  let lastError: unknown = null;

  for (const source of resolveSourceOrder()) {
    try {
      if (source === "snapshot") {
        return await fetchDoctorsFromSnapshot(params);
      }

      return await tryWorkerJson<DoctorsListResponse>(
        "/api/v1/doctors",
        {
          q: params.q,
          specialty: params.specialty,
          clinic: params.clinic,
          page: params.page ?? 1,
          per_page: params.perPage ?? 20,
        },
        {
          cache: "no-store",
          signal: params.signal,
        },
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Не удалось загрузить врачей");
}

export async function fetchDoctorDetail(doctorId: string, signal?: AbortSignal) {
  let lastError: unknown = null;

  for (const source of resolveDoctorDetailSourceOrder()) {
    try {
      if (source === "snapshot") {
        return await fetchDoctorDetailFromSnapshot(doctorId);
      }

      return await tryWorkerJson<DoctorDetailResponse>(
        `/api/v1/doctors/${doctorId}`,
        {},
        {
          cache: "no-store",
          signal,
        },
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Не удалось загрузить карточку врача");
}

export async function fetchPromotions(params?: {
  clinic?: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}) {
  let lastError: unknown = null;

  for (const source of resolveSourceOrder()) {
    try {
      if (source === "snapshot") {
        return await fetchPromotionsFromSnapshot(params);
      }

      return await tryWorkerJson<PromotionListResponse>(
        "/api/v1/promotions",
        {
          clinic: params?.clinic,
          page: params?.page ?? 1,
          per_page: params?.perPage ?? 10,
        },
        {
          cache: "no-store",
          signal: params?.signal,
        },
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Не удалось загрузить акции");
}

export async function fetchCatalogOverview(signal?: AbortSignal) {
  try {
    return await loadOverviewSnapshot();
  } catch {
    try {
      const snapshot = await loadCatalogSnapshot();
      return buildCatalogOverview(snapshot);
    } catch {
      const [doctors, promotions] = await Promise.all([
        tryWorkerJson<DoctorsListResponse>(
          "/api/v1/doctors",
          {
            page: 1,
            per_page: 1,
          },
          {
            cache: "no-store",
            signal,
          },
        ),
        tryWorkerJson<PromotionListResponse>(
          "/api/v1/promotions",
          {
            page: 1,
            per_page: 1,
          },
          {
            cache: "no-store",
            signal,
          },
        ),
      ]);

      return {
        generated_at: null,
        doctors_total: doctors.total,
        promotions_total: promotions.total,
        clinics_total: 0,
        specialties: [],
      } satisfies CatalogOverview;
    }
  }
}
