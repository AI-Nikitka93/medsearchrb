const CYRILLIC_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ы: "y",
  э: "e",
  ю: "yu",
  я: "ya",
  ь: "",
  ъ: "",
};

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

export function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[–—−]/g, "-")
    .replace(/[«»"]/g, "")
    .replace(/ё/g, "е");
}

function collapseHumanText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/gu, " ")
    .replace(/[«»"]/gu, "")
    .trim();
}

function normalizeLocationText(value: string | null | undefined): string {
  return collapseHumanText(value)
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/gu, "е")
    .replace(/[.,/№()«»"\\-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function splitLocationSegments(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(/[;,]/u)
    .map((segment) => normalizeLocationText(segment))
    .filter(Boolean);
}

function hasNormalizedWord(value: string, word: string): boolean {
  return new RegExp(`(^|\\s)${word}($|\\s)`, "u").test(value);
}

function looksLikeStreetSegment(value: string): boolean {
  return STREET_SEGMENT_PATTERN.test(value);
}

export function isMedicalSpecialtyName(value: string | null | undefined): boolean {
  const normalized = normalizeText(collapseHumanText(value));
  if (!normalized) {
    return false;
  }

  return !NON_MEDICAL_SPECIALTY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isMedicalClinicName(value: string | null | undefined): boolean {
  const normalized = normalizeText(collapseHumanText(value));
  if (!normalized) {
    return false;
  }

  return !NON_MEDICAL_CLINIC_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isMinskClinicAddress(value: string | null | undefined): boolean {
  const normalized = normalizeLocationText(value);
  if (!normalized) {
    return false;
  }

  if (OUTSIDE_MINSK_AREA_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  const segments = splitLocationSegments(value);
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

  return segments.length > 0 && looksLikeStreetSegment(segments[0]);
}

export function isExcludedCatalogQuery(value: string | null | undefined): boolean {
  const normalized = normalizeText(collapseHumanText(value));
  if (!normalized) {
    return false;
  }

  return (
    NON_MEDICAL_SPECIALTY_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    NON_MEDICAL_CLINIC_PATTERNS.some((pattern) => pattern.test(normalized))
  );
}

export function looksLikeHtmlOrUrlGarbage(value: string | null | undefined): boolean {
  const raw = normalizeText(value);
  if (!raw) {
    return false;
  }

  return (
    raw.includes("<") ||
    raw.includes(">") ||
    raw.includes("doctype html") ||
    raw.includes("<script") ||
    raw.includes("function(") ||
    raw.includes("google tag manager") ||
    raw.includes("https://") ||
    raw.includes("http://") ||
    raw.includes(".js")
  );
}

export function countNameTokens(value: string | null | undefined): number {
  return collapseHumanText(value)
    .split(/\s+/gu)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

export function sanitizeDoctorFullName(value: string | null | undefined): string | null {
  const collapsed = collapseHumanText(value);
  if (!collapsed) {
    return null;
  }

  if (looksLikeHtmlOrUrlGarbage(collapsed)) {
    return null;
  }

  if (countNameTokens(collapsed) < 2) {
    return null;
  }

  return collapsed;
}

export function sanitizeSpecialtyName(value: string | null | undefined): string | null {
  const collapsed = collapseHumanText(value)
    .replace(/\s*\([^)]*\)\s*$/u, (match) => (match.length <= 24 ? match.trim() : ""))
    .trim();

  if (!collapsed) {
    return null;
  }

  if (looksLikeHtmlOrUrlGarbage(collapsed)) {
    return null;
  }

  if (collapsed.length < 3 || collapsed.length > 120) {
    return null;
  }

  if (!isMedicalSpecialtyName(collapsed)) {
    return null;
  }

  return collapsed;
}

export function slugify(value: string, fallback = "item"): string {
  const normalized = normalizeText(value)
    .split("")
    .map((char) => CYRILLIC_MAP[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

export function normalizeAddress(value: string | null | undefined): string {
  return normalizeText(value)
    .replace(/\bул\.\s*/g, "улица ")
    .replace(/\bпр-т\b/g, "проспект")
    .replace(/\bд\.\s*/g, "дом ");
}

export function normalizeClinicName(value: string | null | undefined): string {
  return normalizeText(value)
    .replace(/\([^)]*\)/g, " ")
    .replace(
      /\b(медицинский центр|медицинская клиника|медицинский кабинет|медцентр|центр семейной медицины|центр эстетической медицины|клиника|центр)\b/g,
      " ",
    )
    .replace(/\b(ооо|ао|зао|чуп|уп)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function significantNameTokens(value: string | null | undefined): string[] {
  const stopWords = new Set([
    "медицинский",
    "медицинская",
    "центр",
    "клиника",
    "кабинет",
    "семейной",
    "эстетической",
    "медицины",
    "ооо",
    "ао",
    "зао",
    "чуп",
    "уп",
    "минск",
  ]);

  return Array.from(
    new Set(
      normalizeClinicName(value)
        .split(/[\s/-]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !stopWords.has(token)),
    ),
  );
}
