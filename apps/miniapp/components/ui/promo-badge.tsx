import type { MouseEvent } from "react";

type PromoBadgeProps = {
  clinic: string;
  title: string;
  deadline?: string;
  compact?: boolean;
  sourceUrl?: string;
  onClick?: () => void;
};

export function PromoBadge({
  clinic,
  title,
  deadline,
  compact = false,
  sourceUrl,
  onClick,
}: PromoBadgeProps) {
  const interactive = Boolean(sourceUrl || onClick);
  const handleClick = (event?: MouseEvent<HTMLElement>) => {
    event?.preventDefault();

    if (onClick) {
      onClick();
      return;
    }

    if (sourceUrl && typeof window !== "undefined") {
      const telegram = (
        globalThis as typeof globalThis & {
          Telegram?: {
            WebApp?: {
              openLink?: (href: string) => void;
            };
          };
        }
      ).Telegram;

      if (telegram?.WebApp?.openLink) {
        telegram.WebApp.openLink(sourceUrl);
        return;
      }

      window.open(sourceUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-pill bg-section px-2 py-1 text-xs font-semibold text-link shadow-soft">
        <span className="block size-2 rounded-full bg-link" />
        <span className="truncate">{title}</span>
      </div>
    );
  }

  const body = (
    <div className="flex items-stretch">
      <div className="w-2 bg-[linear-gradient(180deg,var(--ds-promo-start),var(--ds-promo-end))]" />
      <div className="flex-1 px-3 py-3">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-link">
          {clinic}
        </div>
        <div className="text-sm font-semibold text-text">{title}</div>
        {deadline ? <div className="mt-2 text-xs text-subtle">До {deadline}</div> : null}
        {interactive ? <div className="mt-2 text-xs font-semibold text-link">Открыть акцию</div> : null}
      </div>
      <div className="m-2 flex items-center rounded-md bg-[linear-gradient(180deg,var(--ds-promo-start),var(--ds-promo-end))] px-3 text-actionText">
        %
      </div>
    </div>
  );

  const className = [
    "block w-full overflow-hidden rounded-lg bg-section shadow-card text-left",
    interactive
      ? "cursor-pointer touch-manipulation transition hover:-translate-y-px hover:shadow-soft active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/40"
      : "",
  ]
    .join(" ")
    .trim();

  if (interactive) {
    return (
      <a
        href={sourceUrl ?? "#"}
        onClick={handleClick}
        className={className}
        aria-label={`Открыть акцию: ${title}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {body}
      </a>
    );
  }

  return (
    <div className={className} aria-hidden="true">
      {body}
    </div>
  );
}
