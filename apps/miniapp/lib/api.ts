import { SNAPSHOT_VERSION } from "@/lib/generated/snapshot-version";

const LOCAL_API_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_API_BASE_URL = "https://medsearchrb-api.aiomdurman.workers.dev";

function resolveBasePath() {
  const explicit = process.env.NEXT_PUBLIC_BASE_PATH?.trim();
  if (explicit) {
    return explicit;
  }

  if (typeof window !== "undefined") {
    const { pathname } = window.location;
    if (pathname === "/medsearchrb" || pathname.startsWith("/medsearchrb/")) {
      return "/medsearchrb";
    }
  }

  return "";
}

const BASE_PATH = resolveBasePath();
const SNAPSHOT_VERSION_VALUE: string = SNAPSHOT_VERSION;
const SNAPSHOT_SUFFIX =
  SNAPSHOT_VERSION_VALUE && SNAPSHOT_VERSION_VALUE !== "dev"
    ? `.${SNAPSHOT_VERSION_VALUE}`
    : "";
const SNAPSHOT_PATH = `${BASE_PATH}/data/catalog${SNAPSHOT_SUFFIX}.json`;
const OVERVIEW_SNAPSHOT_PATH = `${BASE_PATH}/data/catalog-overview${SNAPSHOT_SUFFIX}.json`;
const DOCTORS_LIST_SNAPSHOT_PATH = `${BASE_PATH}/data/catalog-list${SNAPSHOT_SUFFIX}.json`;
const PROMOTIONS_SNAPSHOT_PATH = `${BASE_PATH}/data/promotions${SNAPSHOT_SUFFIX}.json`;

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

export type SmartSearchIntent =
  | "doctor"
  | "specialty"
  | "clinic"
  | "promo"
  | "problem"
  | "mixed";

export type SmartSearchDoctorItem = {
  kind: "doctor";
  id: string;
  slug: string;
  full_name: string;
  specialty: string;
  clinic: string;
  rating_avg: number | null;
  reviews_count: number;
  verified_clinic: boolean;
  score: number;
  reason: string;
};

export type SmartSearchClinicItem = {
  kind: "clinic";
  id: string;
  slug: string;
  name: string;
  address: string | null;
  site_url: string | null;
  doctors_count: number;
  promotions_count: number;
  verified: boolean;
  score: number;
};

export type SmartSearchPromotionItem = {
  kind: "promotion";
  id: string;
  title: string;
  clinic_name: string;
  source_url: string;
  ends_at: string | null;
  score: number;
};

export type SmartSearchSpecialtyItem = {
  kind: "specialty";
  slug: string;
  name: string;
  count: number;
  score: number;
};

export type SmartSearchBestMatch =
  | SmartSearchDoctorItem
  | SmartSearchClinicItem
  | SmartSearchPromotionItem
  | SmartSearchSpecialtyItem;

export type SmartSearchResponse = {
  query: string;
  normalized_query: string;
  intent: SmartSearchIntent;
  best_match: SmartSearchBestMatch | null;
  doctors: SmartSearchDoctorItem[];
  clinics: SmartSearchClinicItem[];
  promotions: SmartSearchPromotionItem[];
  specialties: SmartSearchSpecialtyItem[];
  suggestions: string[];
};

export type TelegramSessionResponse = {
  ok: true;
  session: {
    auth_date: number;
    can_send_after: number | null;
    chat_instance: string | null;
    chat_type: string | null;
    query_id: string | null;
    start_param: string | null;
    user: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
      photo_url?: string;
    } | null;
  };
};

type SmartSearchUnderstandingResponse = {
  available: boolean;
  model: string | null;
  provider: "cloudflare" | "groq" | null;
  intent: SmartSearchIntent;
  normalized_query: string;
  mapped_specialties: string[];
  suggested_terms: string[];
  confidence: number;
  reason: string;
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

type DoctorsListSnapshot = {
  generated_at: string;
  items: DoctorsListItem[];
};

type PromotionsSnapshot = {
  generated_at: string;
  items: PromotionListResponse["items"];
};

type QueryValue = string | number | undefined | null;
type DataSourcePreference = "worker" | "snapshot";

type SearchProblemRule = {
  keywords: string[];
  specialties: string[];
};

let catalogSnapshotPromise: Promise<CatalogSnapshot> | null = null;
let overviewSnapshotPromise: Promise<CatalogOverview> | null = null;
let doctorsListSnapshotPromise: Promise<DoctorsListSnapshot> | null = null;
let promotionsSnapshotPromise: Promise<PromotionsSnapshot> | null = null;
const WORKER_TIMEOUT_MS = 2500;
const AI_SEARCH_MIN_QUERY_LENGTH = 12;

const SPECIALTY_ALIAS_MAP: Record<string, string[]> = {
  лор: ["ЛОР", "детский ЛОР"],
  узи: ["Врач УЗИ", "Врач УЗД", "детский врач УЗИ"],
  мрт: ["МРТ-диагност", "Рентгенолог"],
  кт: ["КТ-диагност", "Рентгенолог"],
  сердце: ["Кардиолог", "Кардиолог/аритмолог"],
  щитовидка: ["Эндокринолог"],
  желудок: ["гастроэнтеролог"],
  кожа: ["Дерматолог", "дерматовенеролог"],
  варикоз: ["флеболог", "сосудистый хирург (ангиохирург)"],
  спина: ["Невролог", "Ортопед", "Травматолог"],
  суставы: ["Ортопед", "Травматолог", "Ревматолог"],
  давление: ["Кардиолог", "Терапевт"],
  ребенок: ["Педиатр", "детский ЛОР", "Детский невролог"],
  дети: ["Педиатр", "детский ЛОР", "Детский невролог"],
  анализы: ["Терапевт"],
  попа: ["Проктолог", "Проктолог (колопроктолог)", "детский проктолог"],
  геморрой: ["Проктолог", "Проктолог (колопроктолог)"],
  анус: ["Проктолог", "Проктолог (колопроктолог)"],
  задница: ["Проктолог", "Проктолог (колопроктолог)"],
  "прямая кишка": ["Проктолог", "Проктолог (колопроктолог)"],
};

const PROBLEM_RULES: SearchProblemRule[] = [
  {
    keywords: ["щитовид", "гормон"],
    specialties: ["Эндокринолог"],
  },
  {
    keywords: ["сердц", "давлен", "пульс"],
    specialties: ["Кардиолог", "Терапевт"],
  },
  {
    keywords: ["кожа", "родин", "сып", "акне"],
    specialties: ["Дерматолог", "дерматовенеролог"],
  },
  {
    keywords: ["варик", "вены", "сосуд"],
    specialties: ["флеболог", "сосудистый хирург (ангиохирург)"],
  },
  {
    keywords: ["спин", "поясниц", "шея"],
    specialties: ["Невролог", "Ортопед", "Травматолог"],
  },
  {
    keywords: ["живот", "желуд", "кишеч"],
    specialties: ["гастроэнтеролог", "Терапевт"],
  },
  {
    keywords: ["поп", "гемор", "анус", "прямой кишк", "задниц", "колопрокт"],
    specialties: ["Проктолог", "Проктолог (колопроктолог)", "детский проктолог"],
  },
  {
    keywords: ["ребен", "дет"],
    specialties: ["Педиатр", "детский ЛОР", "Детский невролог"],
  },
];

const PROMO_INTENT_TERMS = ["акци", "скидк", "дешев", "выгод", "чек-ап", "чекап"];
const CLINIC_INTENT_TERMS = ["клиник", "центр", "медцентр", "медицинский"];
const NON_MEDICAL_SPECIALTY_PATTERNS = [
  /парикмах/u,
  /барбер/u,
  /бровист/u,
  /визаж/u,
  /стилист/u,
  /мастер/u,
  /маникюр/u,
  /педикюр/u,
  /шугар/u,
  /депиляц/u,
  /эпиляц/u,
  /ресниц/u,
  /перманентн/u,
  /макияж/u,
  /косметик/u,
  /косметолог/u,
  /дерматокосмет/u,
  /массаж/u,
  /йог/u,
  /инструктор/u,
  /администратор/u,
  /медрегистратор/u,
  /нутрициолог/u,
  /подолог/u,
  /подиатр/u,
  /липокоррек/u,
  /пирсинг/u,
  /узкопрофильн/u,
  /специалист по/u,
  /^специалист$/u,
  /уходу за телом/u,
  /грудному вскармливанию/u,
  /тренер/u,
  /преподавател/u,
  /воспитател/u,
  /спа/u,
  /тату/u,
  /ветеринар/u,
];

const NON_MEDICAL_CLINIC_PATTERNS = [
  /ветеринар/u,
  /ветцентр/u,
  /ветклиник/u,
  /ветмед/u,
  /ветмир/u,
  /доктор вет/u,
  /альфа-вет/u,
  /wellvet/u,
  /animal clinic/u,
  /энимал/u,
  /pets?\s*health/u,
  /zoohelp/u,
  /зооклиник/u,
  /зоовет/u,
  /девять жизней/u,
  /питомец/u,
  /главное хвост/u,
  /базылевск/u,
  /умная ветеринар/u,
];

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
    .replaceAll("ё", "е")
    .replace(/\s+/g, " ");
}

function isMedicalSpecialtyName(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return false;
  }

  return !NON_MEDICAL_SPECIALTY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isMedicalClinicName(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return false;
  }

  return !NON_MEDICAL_CLINIC_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeLocationText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[.,/№()"«»-]+/g, " ")
    .replace(/\s+/g, " ");
}

function splitLocationSegments(value: string) {
  return value
    .split(/[;,]/u)
    .map((segment) => normalizeLocationText(segment))
    .filter(Boolean);
}

function hasNormalizedWord(value: string, word: string) {
  return new RegExp(`(^|\\s)${word}($|\\s)`, "u").test(value);
}

const OUTSIDE_MINSK_AREA_PATTERNS = [
  /минск(?:ий|ого)?\s+район/u,
  /район\s+минск/u,
  /минский\s*р[-\s]*н/u,
  /минск(?:ая)?\s+обл/u,
  /боровлян/u,
  /жданович/u,
  /копищ/u,
  /лесн(?:ой|ого)/u,
  /тарасов/u,
  /колодищ/u,
  /аксаковщин/u,
  /юхновк/u,
  /королев\s*стан/u,
  /валерьянов/u,
  /сельсовет/u,
  /сениц/u,
];

const OUTSIDE_MINSK_SEGMENT_PATTERNS = [
  /(^|\s)(аг|агрогородок|дер|деревня|пос|поселок|с\/с)($|\s)/u,
  /(^|\s)(брест|витебск|гомель|гродно|могилев|борисов|жодино|заславль|дзержинск|столбцы|смолевичи|фаниполь|барановичи|пинск|молодечно|нарочь)($|\s)/u,
];

const STREET_SEGMENT_PATTERN =
  /^(ул|улица|пр|просп|проспект|пер|переулок|тракт|бульвар|б\s*р|пл|площадь|наб|набережная|шоссе|мкад)\b/u;

function isMinskClinicAddress(value: string | null | undefined) {
  const normalized = normalizeLocationText(value ?? "");
  if (!normalized) {
    return false;
  }

  if (OUTSIDE_MINSK_AREA_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  const segments = splitLocationSegments(value ?? "");
  if (
    segments.some((segment) =>
      OUTSIDE_MINSK_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment)),
    )
  ) {
    return false;
  }

  if (hasNormalizedWord(normalized, "минск")) {
    return true;
  }

  return segments.length > 0 && STREET_SEGMENT_PATTERN.test(segments[0]);
}

function isExcludedCatalogQuery(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return false;
  }

  return (
    NON_MEDICAL_SPECIALTY_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    NON_MEDICAL_CLINIC_PATTERNS.some((pattern) => pattern.test(normalized))
  );
}

function sanitizeDoctorSpecialties(specialties: DoctorSpecialty[]) {
  return specialties.filter((item) => isMedicalSpecialtyName(item.name));
}

function getSearchableClinicNames(clinics: Array<{ name: string }>) {
  return clinics
    .map((item) => item.name)
    .filter((name) => isMedicalClinicName(name) && !isExcludedCatalogQuery(name));
}

function hasValidDoctorName(fullName: string) {
  return normalizeText(fullName)
    .split(/\s+/u)
    .filter(Boolean).length >= 2;
}

function sanitizeCatalogSnapshot(snapshot: CatalogSnapshot): CatalogSnapshot {
  const doctors = snapshot.doctors
    .map((doctor) => ({
      ...doctor,
      specialties: sanitizeDoctorSpecialties(doctor.specialties),
      clinics: doctor.clinics.filter(
        (clinic) =>
          isMedicalClinicName(clinic.name) && isMinskClinicAddress(clinic.address),
      ),
      promotions: doctor.promotions.filter((promotion) =>
        isMedicalClinicName(promotion.clinic.name),
      ),
    }))
    .filter((doctor) => doctor.specialties.length > 0)
    .filter((doctor) => doctor.clinics.length > 0)
    .filter((doctor) => hasValidDoctorName(doctor.full_name));

  const allowedDoctorIds = new Set(doctors.map((doctor) => doctor.id));
  const allowedClinicIds = new Set(
    doctors.flatMap((doctor) => doctor.clinics.map((clinic) => clinic.id)),
  );

  const sanitizedDoctors = doctors.map((doctor) => ({
    ...doctor,
    promotions: doctor.promotions.filter((promotion) =>
      allowedClinicIds.has(promotion.clinic.id),
    ),
  }));

  return {
    ...snapshot,
    doctors: sanitizedDoctors,
    promotions: snapshot.promotions
      .filter((promotion) => isMedicalClinicName(promotion.clinic.name))
      .filter((promotion) => allowedClinicIds.has(promotion.clinic.id))
      .map((promotion) => ({
        ...promotion,
        doctor:
          promotion.doctor && !allowedDoctorIds.has(promotion.doctor.id)
            ? null
            : promotion.doctor,
      })),
  };
}

function sanitizeDoctorsListResponse(response: DoctorsListResponse): DoctorsListResponse {
  const items = response.items
    .map((item) => ({
      ...item,
      specialties: item.specialties.filter((specialty) => isMedicalSpecialtyName(specialty)),
      clinics: item.clinics.filter((clinic) => isMedicalClinicName(clinic)),
    }))
    .filter((item) => item.specialties.length > 0)
    .filter((item) => hasValidDoctorName(item.full_name));

  return {
    ...response,
    total:
      items.length < response.items.length
        ? Math.max(items.length, response.total - (response.items.length - items.length))
        : response.total,
    items,
  };
}

function sanitizeDoctorDetailResponse(
  response: DoctorDetailResponse,
): DoctorDetailResponse | null {
  const specialties = sanitizeDoctorSpecialties(response.item.specialties);
  if (specialties.length === 0 || !hasValidDoctorName(response.item.full_name)) {
    return null;
  }

  const clinics = response.item.clinics.filter(
    (clinic) =>
      isMedicalClinicName(clinic.name) && isMinskClinicAddress(clinic.address),
  );
  if (clinics.length === 0) {
    return null;
  }
  const allowedClinicIds = new Set(clinics.map((clinic) => clinic.id));

  return {
    item: {
      ...response.item,
      specialties,
      clinics,
      promotions: response.item.promotions.filter(
        (promotion) =>
          isMedicalClinicName(promotion.clinic.name) &&
          allowedClinicIds.has(promotion.clinic.id),
      ),
    },
  };
}

function tokenizeSearch(value: string) {
  return normalizeText(value)
    .split(/[^a-zа-я0-9]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

function uniqueItems<T>(items: T[]) {
  return Array.from(new Set(items));
}

function queryHasAlias(normalizedQuery: string, tokens: string[], alias: string) {
  const normalizedAlias = normalizeText(alias);
  if (!normalizedAlias) {
    return false;
  }

  if (normalizedAlias.includes(" ")) {
    return normalizedQuery.includes(normalizedAlias);
  }

  return tokens.includes(normalizedAlias);
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

function stringContainsAllTokens(value: string, tokens: string[]) {
  return tokens.every((token) => value.includes(token));
}

function inferIntent(
  query: string,
  mappedSpecialties: string[],
  doctorHits: number,
  clinicHits: number,
  promotionHits: number,
) {
  const tokens = tokenizeSearch(query);

  if (tokens.some((token) => PROMO_INTENT_TERMS.some((term) => token.includes(term)))) {
    return "promo" satisfies SmartSearchIntent;
  }

  if (tokens.some((token) => CLINIC_INTENT_TERMS.some((term) => token.includes(term)))) {
    return "clinic" satisfies SmartSearchIntent;
  }

  if (mappedSpecialties.length > 0) {
    return "problem" satisfies SmartSearchIntent;
  }

  if (doctorHits > 0 && clinicHits === 0 && promotionHits === 0) {
    return "doctor" satisfies SmartSearchIntent;
  }

  if (clinicHits > 0 && doctorHits === 0) {
    return "clinic" satisfies SmartSearchIntent;
  }

  if (promotionHits > 0 && doctorHits === 0) {
    return "promo" satisfies SmartSearchIntent;
  }

  return "mixed" satisfies SmartSearchIntent;
}

function mapProblemSpecialties(query: string) {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenizeSearch(query);
  const mapped = new Set<string>();

  for (const [alias, specialties] of Object.entries(SPECIALTY_ALIAS_MAP)) {
    if (queryHasAlias(normalizedQuery, tokens, alias)) {
      specialties.forEach((specialty) => mapped.add(specialty));
    }
  }

  for (const rule of PROBLEM_RULES) {
    if (rule.keywords.some((keyword) => normalizedQuery.includes(keyword))) {
      rule.specialties.forEach((specialty) => mapped.add(specialty));
    }
  }

  return Array.from(mapped);
}

function scoreTextMatch(haystack: string, query: string, tokens: string[]) {
  let score = 0;
  if (!query) {
    return score;
  }

  if (haystack === query) {
    score += 120;
  } else if (haystack.startsWith(query)) {
    score += 75;
  } else if (haystack.includes(query)) {
    score += 45;
  }

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 12;
    }
  }

  if (tokens.length > 1 && stringContainsAllTokens(haystack, tokens)) {
    score += 28;
  }

  return score;
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

function buildSmartClinicIndex(snapshot: CatalogSnapshot) {
  const clinicMap = new Map<
    string,
    {
      id: string;
      slug: string;
      name: string;
      normalized_name: string;
      address: string | null;
      site_url: string | null;
      doctors_count: number;
      promotions_count: number;
      verified: boolean;
    }
  >();

  for (const doctor of snapshot.doctors) {
    for (const clinic of doctor.clinics) {
      const key = clinic.id || clinic.slug || normalizeText(clinic.name);
      const current = clinicMap.get(key);

      if (current) {
        current.doctors_count += 1;
        current.verified =
          current.verified ||
          Boolean(
            clinic.verified_on_clinic_site ||
              clinic.verification_status === "official_source",
          );
        continue;
      }

      clinicMap.set(key, {
        id: clinic.id,
        slug: clinic.slug,
        name: clinic.name,
        normalized_name: normalizeText(clinic.name),
        address: clinic.address,
        site_url: clinic.site_url,
        doctors_count: 1,
        promotions_count: 0,
        verified: Boolean(
          clinic.verified_on_clinic_site || clinic.verification_status === "official_source",
        ),
      });
    }
  }

  for (const promotion of snapshot.promotions) {
    const clinic = Array.from(clinicMap.values()).find(
      (item) =>
        item.id === promotion.clinic.id ||
        item.slug === promotion.clinic.slug ||
        item.normalized_name === normalizeText(promotion.clinic.name),
    );

    if (clinic) {
      clinic.promotions_count += 1;
    }
  }

  return Array.from(clinicMap.values());
}

function buildSmartSpecialtyIndex(snapshot: CatalogSnapshot): SmartSearchSpecialtyItem[] {
  return buildCatalogOverview(snapshot).specialties.map((specialty) => ({
    kind: "specialty",
    slug: specialty.slug,
    name: specialty.name,
    count: specialty.count,
    score: 0,
  }));
}

function buildSmartSuggestions(
  query: string,
  intent: SmartSearchIntent,
  mappedSpecialties: string[],
  specialties: SmartSearchSpecialtyItem[],
  clinics: SmartSearchClinicItem[],
  promotions: SmartSearchPromotionItem[],
) {
  const suggestions = new Set<string>();

  mappedSpecialties.slice(0, 3).forEach((item) => suggestions.add(item));
  specialties.slice(0, 2).forEach((item) => suggestions.add(item.name));
  clinics.slice(0, 2).forEach((item) => suggestions.add(item.name));

  if (intent !== "promo" && promotions.length > 0) {
    suggestions.add(`Акции по запросу «${query.trim()}»`);
  }

  if (intent === "problem" && mappedSpecialties.length > 0) {
    suggestions.add(`Лучшие врачи: ${mappedSpecialties[0]}`);
  }

  return Array.from(suggestions).slice(0, 5);
}

async function fetchSmartSearchFromSnapshot(
  query: string,
  signal?: AbortSignal,
): Promise<SmartSearchResponse> {
  if (isExcludedCatalogQuery(query)) {
    return {
      query,
      normalized_query: normalizeText(query),
      intent: "mixed",
      best_match: null,
      doctors: [],
      clinics: [],
      promotions: [],
      specialties: [],
      suggestions: [],
    };
  }

  const snapshot = await loadCatalogSnapshot();
  if (signal?.aborted) {
    throw new Error("Search aborted");
  }

  const understanding = await fetchSearchUnderstanding(query, signal);
  const normalizedQuery = normalizeText(
    understanding?.normalized_query?.trim() || query,
  );
  const expandedQuery = uniqueItems([
    normalizedQuery,
    ...(understanding?.suggested_terms ?? []),
  ]).join(" ");
  const tokens = tokenizeSearch(expandedQuery);
  const excludeClinicMatches = isExcludedCatalogQuery(normalizedQuery);
  const mappedSpecialties = uniqueItems([
    ...mapProblemSpecialties(query),
    ...(understanding?.mapped_specialties ?? []),
  ]);

  const doctors = snapshot.doctors
    .map<SmartSearchDoctorItem | null>((doctor) => {
      const doctorName = normalizeText(doctor.full_name);
      const specialtyNames = doctor.specialties.map((item) => item.name);
      const normalizedSpecialties = specialtyNames.map((item) => normalizeText(item));
      const clinicNames = getSearchableClinicNames(doctor.clinics);
      const normalizedClinics = clinicNames.map((item) => normalizeText(item));
      const description = normalizeText(doctor.description_short ?? "");
      const haystack = [doctorName, ...normalizedSpecialties, ...normalizedClinics, description].join(
        " ",
      );

      const doctorNameScore = scoreTextMatch(doctorName, normalizedQuery, tokens);
      const haystackScore = scoreTextMatch(haystack, normalizedQuery, tokens);
      let score = doctorNameScore + haystackScore;

      const specialtyOverlap = mappedSpecialties.filter((specialty) =>
        normalizedSpecialties.some((item) => item.includes(normalizeText(specialty))),
      );

      if (score <= 0 && specialtyOverlap.length === 0) {
        return null;
      }

      if (specialtyOverlap.length > 0) {
        score += 50;
      }

      if (doctor.reviews_count > 0) {
        score += Math.min(doctor.reviews_count, 200) / 5;
      }

      const verifiedClinic = doctor.clinics.some(
        (clinic) =>
          clinic.verified_on_clinic_site || clinic.verification_status === "official_source",
      );

      if (verifiedClinic) {
        score += 12;
      }

      if (score < 35) {
        return null;
      }

      return {
        kind: "doctor",
        id: doctor.id,
        slug: doctor.slug,
        full_name: doctor.full_name,
        specialty: specialtyNames[0] ?? "Специалист",
        clinic: clinicNames[0] ?? "Клиника уточняется",
        rating_avg: doctor.rating_avg,
        reviews_count: doctor.reviews_count,
        verified_clinic: verifiedClinic,
        score,
        reason:
          specialtyOverlap.length > 0
            ? `Подходит по запросу и по проблеме: ${specialtyOverlap[0]}`
            : doctorName.includes(normalizedQuery)
              ? "Точное совпадение по врачу"
              : "Подходит по имени, клинике или специальности",
      };
    })
    .filter((item): item is SmartSearchDoctorItem => Boolean(item))
    .sort((left, right) => right.score - left.score || compareByDoctorPriority(left, right))
    .slice(0, 6);

  const clinics = buildSmartClinicIndex(snapshot)
    .filter((clinic) => !excludeClinicMatches || !isExcludedCatalogQuery(clinic.name))
    .map<SmartSearchClinicItem | null>((clinic) => {
      const haystack = normalizeText([clinic.name, clinic.address ?? "", clinic.site_url ?? ""].join(" "));
      const clinicNameScore = scoreTextMatch(clinic.normalized_name, normalizedQuery, tokens);
      const haystackScore = scoreTextMatch(haystack, normalizedQuery, tokens);
      let score = clinicNameScore + haystackScore;

      if (score <= 0) {
        return null;
      }

      score += Math.min(clinic.doctors_count, 80) / 4;
      score += Math.min(clinic.promotions_count, 20) * 2;

      if (clinic.verified) {
        score += 12;
      }

      if (score < 30) {
        return null;
      }

      return {
        kind: "clinic",
        id: clinic.id,
        slug: clinic.slug,
        name: clinic.name,
        address: clinic.address,
        site_url: clinic.site_url,
        doctors_count: clinic.doctors_count,
        promotions_count: clinic.promotions_count,
        verified: clinic.verified,
        score,
      };
    })
    .filter((item): item is SmartSearchClinicItem => Boolean(item))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "ru"))
    .slice(0, 4);

  const promotions = snapshot.promotions
    .map<SmartSearchPromotionItem | null>((promotion) => {
      const haystack = normalizeText([promotion.title, promotion.clinic.name].join(" "));
      let score = scoreTextMatch(haystack, normalizedQuery, tokens);

      if (
        tokens.some((token) => PROMO_INTENT_TERMS.some((term) => token.includes(term))) &&
        score > 0
      ) {
        score += 24;
      }

      if (score < 30) {
        return null;
      }

      return {
        kind: "promotion",
        id: promotion.id,
        title: promotion.title,
        clinic_name: promotion.clinic.name,
        source_url: promotion.source_url,
        ends_at: promotion.ends_at,
        score,
      };
    })
    .filter((item): item is SmartSearchPromotionItem => Boolean(item))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "ru"))
    .slice(0, 4);

  const specialties = buildSmartSpecialtyIndex(snapshot)
    .map((specialty) => {
      const normalizedName = normalizeText(specialty.name);
      let score = scoreTextMatch(normalizedName, normalizedQuery, tokens);

      if (mappedSpecialties.some((item) => normalizeText(item) === normalizedName)) {
        score += 40;
      }

      if (score < 25) {
        return null;
      }

      return {
        ...specialty,
        score: score + Math.min(specialty.count, 100) / 10,
      };
    })
    .filter((item): item is SmartSearchSpecialtyItem => Boolean(item))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "ru"))
    .slice(0, 4);

  const inferredIntent = inferIntent(
    query,
    mappedSpecialties,
    doctors.length,
    clinics.length,
    promotions.length,
  );
  const intent =
    understanding && understanding.confidence >= 0.75
      ? understanding.intent
      : inferredIntent;

  const bestMatch =
    intent === "promo"
      ? promotions[0] ?? doctors[0] ?? clinics[0] ?? specialties[0] ?? null
      : intent === "clinic"
        ? clinics[0] ?? doctors[0] ?? specialties[0] ?? promotions[0] ?? null
        : intent === "problem" || intent === "doctor"
          ? doctors[0] ?? specialties[0] ?? clinics[0] ?? promotions[0] ?? null
          : specialties[0] ?? doctors[0] ?? clinics[0] ?? promotions[0] ?? null;

  return {
    query,
    normalized_query: normalizedQuery,
    intent,
    best_match: bestMatch,
    doctors,
    clinics,
    promotions,
    specialties,
    suggestions: uniqueItems([
      ...buildSmartSuggestions(
        query,
        intent,
        mappedSpecialties,
        specialties,
        clinics,
        promotions,
      ),
      ...(understanding?.suggested_terms ?? []),
      ...(understanding?.mapped_specialties ?? []),
    ]).slice(0, 6),
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

        const overview = (await response.json()) as CatalogOverview;
        return {
          ...overview,
          specialties: overview.specialties.filter((item) =>
            isMedicalSpecialtyName(item.name),
          ),
        };
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

        return sanitizeCatalogSnapshot((await response.json()) as CatalogSnapshot);
      })
      .catch((error) => {
        catalogSnapshotPromise = null;
        throw error;
      });
  }

  return catalogSnapshotPromise;
}

async function loadDoctorsListSnapshot() {
  if (!doctorsListSnapshotPromise) {
    doctorsListSnapshotPromise = fetch(DOCTORS_LIST_SNAPSHOT_PATH, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Doctors list snapshot HTTP ${response.status}`);
        }

        return (await response.json()) as DoctorsListSnapshot;
      })
      .catch((error) => {
        doctorsListSnapshotPromise = null;
        throw error;
      });
  }

  return doctorsListSnapshotPromise;
}

async function loadPromotionsSnapshot() {
  if (!promotionsSnapshotPromise) {
    promotionsSnapshotPromise = fetch(PROMOTIONS_SNAPSHOT_PATH, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Promotions snapshot HTTP ${response.status}`);
        }

        return (await response.json()) as PromotionsSnapshot;
      })
      .catch((error) => {
        promotionsSnapshotPromise = null;
        throw error;
      });
  }

  return promotionsSnapshotPromise;
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

function shouldUseAiSearchUnderstanding(query: string) {
  const tokens = tokenizeSearch(query);
  return query.trim().length >= AI_SEARCH_MIN_QUERY_LENGTH || tokens.length >= 3;
}

async function fetchSearchUnderstanding(
  query: string,
  signal?: AbortSignal,
): Promise<SmartSearchUnderstandingResponse | null> {
  if (!shouldUseAiSearchUnderstanding(query)) {
    return null;
  }

  try {
    return await tryWorkerJson<SmartSearchUnderstandingResponse>(
      "/api/v1/search/understand",
      {
        q: query,
      },
      {
        cache: "no-store",
        signal,
      },
    );
  } catch {
    return null;
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
  if (params.q && isExcludedCatalogQuery(params.q)) {
    return {
      total: 0,
      page: params.page ?? 1,
      per_page: params.perPage ?? 20,
      items: [],
    };
  }

  const snapshot = await loadDoctorsListSnapshot();
  const normalizedQuery = params.q ? normalizeText(params.q) : null;
  const normalizedSpecialty = params.specialty ? normalizeText(params.specialty) : null;
  const normalizedClinic = params.clinic ? normalizeText(params.clinic) : null;
  const excludeClinicMatches = normalizedQuery ? isExcludedCatalogQuery(normalizedQuery) : false;

  const filteredDoctors = snapshot.items
    .filter((doctor) => {
      if (normalizedQuery) {
        const clinicNames = excludeClinicMatches
          ? doctor.clinics.filter((item) => !NON_MEDICAL_CLINIC_PATTERNS.some((pattern) => pattern.test(normalizeText(item))))
          : doctor.clinics;
        const haystack = normalizeText(
          [
            doctor.full_name,
            ...doctor.specialties,
            ...clinicNames,
          ].join(" "),
        );

        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      if (
        normalizedSpecialty &&
        !doctor.specialties.some((item) => normalizeText(item) === normalizedSpecialty)
      ) {
        return false;
      }

      if (
        normalizedClinic &&
        !doctor.clinics.some((item) => normalizeText(item) === normalizedClinic)
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
      specialties: doctor.specialties,
      clinics: doctor.clinics,
      rating_avg: doctor.rating_avg,
      reviews_count: doctor.reviews_count,
      promo_title: doctor.promo_title,
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
  const snapshot = await loadPromotionsSnapshot();
  const normalizedClinic = params?.clinic ? normalizeText(params.clinic) : null;
  const filteredPromotions = snapshot.items.filter((promotion) => {
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
  if (params.q && isExcludedCatalogQuery(params.q)) {
    return {
      total: 0,
      page: params.page ?? 1,
      per_page: params.perPage ?? 20,
      items: [],
    };
  }

  let lastError: unknown = null;

  for (const source of resolveSourceOrder()) {
    try {
      if (source === "snapshot") {
        return await fetchDoctorsFromSnapshot(params);
      }

      return sanitizeDoctorsListResponse(
        await tryWorkerJson<DoctorsListResponse>(
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
        ),
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

      const response = sanitizeDoctorDetailResponse(
        await tryWorkerJson<DoctorDetailResponse>(
          `/api/v1/doctors/${doctorId}`,
          {},
          {
            cache: "no-store",
            signal,
          },
        ),
      );
      if (!response) {
        throw new Error("doctor not found");
      }

      return response;
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
      const [doctors, promotions] = await Promise.all([
        loadDoctorsListSnapshot(),
        loadPromotionsSnapshot(),
      ]);

      const specialtyMap = new Map<string, { slug: string; name: string; count: number }>();
      const clinicNames = new Set<string>();

      for (const doctor of doctors.items) {
        for (const specialty of doctor.specialties) {
          const normalized = normalizeText(specialty);
          const current = specialtyMap.get(normalized);
          if (current) {
            current.count += 1;
            continue;
          }

          specialtyMap.set(normalized, {
            slug: normalized,
            name: specialty,
            count: 1,
          });
        }

        for (const clinic of doctor.clinics) {
          clinicNames.add(clinic);
        }
      }

      return {
        generated_at: doctors.generated_at ?? promotions.generated_at ?? null,
        doctors_total: doctors.items.length,
        promotions_total: promotions.items.length,
        clinics_total: clinicNames.size,
        specialties: Array.from(specialtyMap.values()).sort((left, right) => {
          if (right.count !== left.count) {
            return right.count - left.count;
          }

          return left.name.localeCompare(right.name, "ru");
        }),
      } satisfies CatalogOverview;
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

export async function fetchSmartSearch(query: string, signal?: AbortSignal) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      query,
      normalized_query: "",
      intent: "mixed",
      best_match: null,
      doctors: [],
      clinics: [],
      promotions: [],
      specialties: [],
      suggestions: [],
    } satisfies SmartSearchResponse;
  }

  if (isExcludedCatalogQuery(trimmedQuery)) {
    return {
      query,
      normalized_query: normalizeText(trimmedQuery),
      intent: "mixed",
      best_match: null,
      doctors: [],
      clinics: [],
      promotions: [],
      specialties: [],
      suggestions: [],
    } satisfies SmartSearchResponse;
  }

  return fetchSmartSearchFromSnapshot(trimmedQuery, signal);
}

export async function fetchTelegramSession(initData: string, signal?: AbortSignal) {
  return fetchJson<TelegramSessionResponse>(
    "/api/v1/telegram/session",
    {},
    {
      method: "POST",
      cache: "no-store",
      signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        init_data: initData,
      }),
    },
  );
}
