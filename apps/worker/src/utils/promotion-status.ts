import { normalizeText } from "./normalize";

const ENDED_PROMOTION_MARKERS = [
  "акция завершена",
  "акция завершилась",
  "акция завершен",
  "акция окончена",
  "акция окончилась",
  "предложение завершено",
  "предложение завершилось",
  "предложение не действует",
  "акция не действует",
  "скидка не действует",
  "акция более не действует",
  "предложение более не действует",
];

export function promotionHasEndMarker(...values: Array<string | null | undefined>) {
  const haystack = values
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(" ");

  if (!haystack) {
    return false;
  }

  return ENDED_PROMOTION_MARKERS.some((marker) => haystack.includes(marker));
}

export function parsePromotionDate(value: string | null | undefined): Date | null {
  const normalized = (value ?? "").trim();
  if (!normalized) {
    return null;
  }

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(
      Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])),
    );
  }

  const dottedMatch = normalized.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dottedMatch) {
    return new Date(
      Date.UTC(Number(dottedMatch[3]), Number(dottedMatch[2]) - 1, Number(dottedMatch[1])),
    );
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function promotionIsExpired(
  value: string | null | undefined,
  now = new Date(),
) {
  const parsed = parsePromotionDate(value);
  if (!parsed) {
    return false;
  }

  const threshold = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  return parsed.getTime() < threshold.getTime();
}

const CHANNEL_PROMOTION_MAX_AGE_DAYS = 45;

export function promotionHasCurrentDateEvidence(args: {
  endsAt?: string | null;
  publishedAt?: string | null;
  now?: Date;
}) {
  const now = args.now ?? new Date();

  if (args.endsAt && !promotionIsExpired(args.endsAt, now)) {
    return true;
  }

  const publishedAt = parsePromotionDate(args.publishedAt);
  if (!publishedAt) {
    return false;
  }

  const threshold = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const ageMs = threshold.getTime() - publishedAt.getTime();
  const maxAgeMs = CHANNEL_PROMOTION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  return ageMs >= 0 && ageMs <= maxAgeMs;
}

export function promotionIsActive(args: {
  title: string;
  endsAt?: string | null;
  contentText?: string | null;
}) {
  if (promotionHasEndMarker(args.title, args.contentText)) {
    return false;
  }

  if (promotionIsExpired(args.endsAt)) {
    return false;
  }

  return true;
}
