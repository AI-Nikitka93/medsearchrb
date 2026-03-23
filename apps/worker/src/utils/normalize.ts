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
