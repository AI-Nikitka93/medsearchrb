const LOCAL_API_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_API_BASE_URL = "https://medsearchrb-api.aiomdurman.workers.dev";

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
    specialties: Array<{
      id: string;
      slug: string;
      name: string;
      is_primary: boolean;
    }>;
    clinics: Array<{
      id: string;
      slug: string;
      name: string;
      address: string | null;
      site_url: string | null;
      booking_url: string | null;
      profile_url: string | null;
    }>;
    reviews: Array<{
      source_name: string;
      source_page_url: string;
      rating_avg: number | null;
      reviews_count: number;
      captured_at: string;
    }>;
    promotions: Array<{
      id: string;
      title: string;
      source_url: string;
      ends_at: string | null;
      clinic: {
        id: string;
        slug: string;
        name: string;
      };
    }>;
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

type QueryValue = string | number | undefined | null;

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

export async function fetchDoctors(params: {
  q?: string;
  specialty?: string;
  clinic?: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}) {
  return fetchJson<DoctorsListResponse>(
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
}

export async function fetchDoctorDetail(doctorId: string, signal?: AbortSignal) {
  return fetchJson<DoctorDetailResponse>(
    `/api/v1/doctors/${doctorId}`,
    {},
    {
      cache: "no-store",
      signal,
    },
  );
}

export async function fetchPromotions(params?: {
  clinic?: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}) {
  return fetchJson<PromotionListResponse>(
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
}
