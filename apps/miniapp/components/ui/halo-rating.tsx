type HaloRatingProps = {
  rating: number | null;
  reviewCount: number;
  compact?: boolean;
};

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4 fill-current"
    >
      <path d="M10 1.75l2.427 4.92 5.43.79-3.928 3.83.927 5.41L10 14.13l-4.856 2.57.928-5.41L2.143 7.46l5.43-.79L10 1.75Z" />
    </svg>
  );
}

export function HaloRating({
  rating,
  reviewCount,
  compact = false,
}: HaloRatingProps) {
  if (rating === null) {
    return (
      <div
        className={[
          "inline-flex items-center gap-1 rounded-pill bg-surface text-subtle shadow-soft",
          compact ? "px-2 py-1 text-xs font-semibold" : "px-3 py-2 text-sm font-bold",
        ].join(" ")}
      >
        <span>Нет оценок</span>
      </div>
    );
  }

  return (
    <div
      className={[
        "inline-flex items-center gap-1 rounded-pill bg-surface text-accent shadow-halo",
        compact ? "px-2 py-1 text-xs font-semibold" : "px-3 py-2 text-sm font-bold",
      ].join(" ")}
    >
      <StarIcon />
      <span>{rating.toFixed(1)}</span>
      <span className="text-subtle">({reviewCount})</span>
    </div>
  );
}
