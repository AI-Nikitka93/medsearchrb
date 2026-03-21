type PromoBadgeProps = {
  clinic: string;
  title: string;
  deadline?: string;
  compact?: boolean;
};

export function PromoBadge({
  clinic,
  title,
  deadline,
  compact = false,
}: PromoBadgeProps) {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-pill bg-section px-2 py-1 text-xs font-semibold text-link shadow-soft">
        <span className="block size-2 rounded-full bg-link" />
        <span className="truncate">{title}</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-section shadow-card">
      <div className="flex items-stretch">
        <div className="w-2 bg-[linear-gradient(180deg,var(--ds-promo-start),var(--ds-promo-end))]" />
        <div className="flex-1 px-3 py-3">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-link">
            {clinic}
          </div>
          <div className="text-sm font-semibold text-text">{title}</div>
          {deadline ? (
            <div className="mt-2 text-xs text-subtle">До {deadline}</div>
          ) : null}
        </div>
        <div className="m-2 flex items-center rounded-md bg-[linear-gradient(180deg,var(--ds-promo-start),var(--ds-promo-end))] px-3 text-actionText">
          %
        </div>
      </div>
    </div>
  );
}
