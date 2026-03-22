"use client";

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  fetchCatalogOverview,
  fetchDoctorDetail,
  fetchDoctors,
  fetchPromotions,
  type CatalogOverview,
} from "@/lib/api";
import { PrimaryButton } from "@/components/ui/button";
import {
  DoctorCard,
  type DoctorCardData,
} from "@/components/ui/doctor-card";
import { HaloRating } from "@/components/ui/halo-rating";
import { PromoBadge } from "@/components/ui/promo-badge";
import { SearchInput } from "@/components/ui/search-input";

type Screen = "home" | "list" | "detail";
type LoadStatus = "idle" | "loading" | "success" | "error";

type CatalogAppProps = {
  initialScreen?: Screen;
};

type DoctorDetailRecord = {
  id: string;
  full_name: string;
  description_short: string | null;
  specialties: string[];
  clinics: Array<{
    id: string;
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
  }>;
  promotions: Array<{
    id: string;
    title: string;
    ends_at: string | null;
    clinic_name: string;
    source_url: string;
  }>;
  reviews: Array<{
    source_name: string;
    source_page_url: string;
    rating_avg: number | null;
    reviews_count: number;
  }>;
  rating_avg: number | null;
  reviews_count: number;
};

type DoctorDetailState = {
  doctorId: string | null;
  status: LoadStatus;
  error: string | null;
};

type ClinicLinkAction = {
  key: string;
  label: string;
  url: string;
  style: "primary" | "secondary";
};

type ReviewSummaryItem = {
  source_name: string;
  source_page_url: string;
  rating_avg: number | null;
  reviews_count: number;
};

const FALLBACK_SPECIALTIES = [
  { slug: "ginekolog", name: "Гинеколог", count: 0 },
  { slug: "uzi", name: "УЗИ", count: 0 },
  { slug: "dermatolog", name: "Дерматолог", count: 0 },
  { slug: "lor", name: "ЛОР", count: 0 },
  { slug: "kardiolog", name: "Кардиолог", count: 0 },
  { slug: "nevrolog", name: "Невролог", count: 0 },
] as const;

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-5 stroke-current"
      fill="none"
      strokeWidth="1.8"
    >
      <path d="M11.75 4.5 6.25 10l5.5 5.5" />
      <path d="M6.75 10h7" />
    </svg>
  );
}

function aggregateReviewSummary(reviews: ReviewSummaryItem[]) {
  const base = reviews.reduce(
    (acc, review) => {
      acc.reviews_count += review.reviews_count;
      if (review.rating_avg !== null && review.reviews_count > 0) {
        acc.weighted_score += review.rating_avg * review.reviews_count;
        acc.weighted_count += review.reviews_count;
      } else if (review.rating_avg !== null) {
        acc.fallback.push(review.rating_avg);
      }
      return acc;
    },
    {
      weighted_score: 0,
      weighted_count: 0,
      reviews_count: 0,
      fallback: [] as number[],
    },
  );

  return {
    rating_avg:
      base.weighted_count > 0
        ? Number((base.weighted_score / base.weighted_count).toFixed(1))
        : base.fallback.length > 0
          ? Math.max(...base.fallback)
          : null,
    reviews_count: base.reviews_count,
  };
}

function formatReviewSourceName(sourceName: string) {
  switch (sourceName) {
    case "ydoc":
      return "YDoc";
    case "103.by":
      return "103.by";
    case "doktora.by":
      return "Doktora.by";
    default:
      return sourceName;
  }
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4 stroke-current"
      fill="none"
      strokeWidth="1.8"
    >
      <path d="m8 5 5 5-5 5" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-5 stroke-current"
      fill="none"
      strokeWidth="1.8"
    >
      <path d="m10 2 1.9 4.6L16.5 8l-4.6 1.9L10 14.5l-1.9-4.6L3.5 8l4.6-1.4L10 2Z" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-5 stroke-current"
      fill="none"
      strokeWidth="1.8"
    >
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h9A1.5 1.5 0 0 1 16 6.5v2A1.5 1.5 0 0 0 16 11.5v2a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 13.5v-2A1.5 1.5 0 0 0 4 8.5v-2Z" />
      <path d="M10 5.5v9" strokeDasharray="2 2" />
    </svg>
  );
}

function SearchFocusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-5 stroke-current"
      fill="none"
      strokeWidth="1.8"
    >
      <circle cx="9" cy="9" r="5.25" />
      <path d="M13.5 13.5 17 17" />
      <path d="M9 6.5v5" />
      <path d="M6.5 9H11.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-5 stroke-current"
      fill="none"
      strokeWidth="1.8"
    >
      <path d="m5 5 10 10" />
      <path d="M15 5 5 15" />
    </svg>
  );
}

function toInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

function formatCount(value: number) {
  return value.toLocaleString("ru-BY");
}

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU");
}

function formatDeadline(dateValue: string | null) {
  if (!dateValue) {
    return undefined;
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat("ru-BY", {
    day: "numeric",
    month: "long",
  }).format(parsed);
}

function getHostname(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.toLocaleLowerCase("ru-RU");
  } catch {
    return null;
  }
}

function isAggregatorHost(hostname: string | null) {
  if (!hostname) {
    return false;
  }

  return ["ydoc.by", "www.ydoc.by"].includes(hostname);
}

function buildClinicActions(clinic: {
  id: string;
  name: string;
  site_url: string | null;
  booking_url: string | null;
  profile_url: string | null;
  official_booking_url?: string | null;
  official_profile_url?: string | null;
  aggregator_booking_url?: string | null;
  aggregator_profile_url?: string | null;
}) {
  const actions: ClinicLinkAction[] = [];
  const seen = new Set<string>();

  const register = (
    url: string | null,
    label: string,
    style: "primary" | "secondary",
  ) => {
    if (!url || seen.has(url)) {
      return;
    }

    seen.add(url);
    actions.push({
      key: `${clinic.id}-${label}-${actions.length}`,
      label,
      url,
      style,
    });
  };

  const siteHost = getHostname(clinic.site_url);
  const bookingHost = getHostname(clinic.booking_url);
  const profileHost = getHostname(clinic.profile_url);
  const officialBookingHost = getHostname(clinic.official_booking_url ?? null);
  const officialProfileHost = getHostname(clinic.official_profile_url ?? null);
  const hasOfficialClinicSite = clinic.site_url && !isAggregatorHost(siteHost);

  if (clinic.official_booking_url) {
    register(
      clinic.official_booking_url,
      isAggregatorHost(officialBookingHost) ? "Запись через YDoc" : "Записаться в клинике",
      "primary",
    );
  }

  if (clinic.official_profile_url) {
    register(
      clinic.official_profile_url,
      isAggregatorHost(officialProfileHost) ? "Карточка на YDoc" : "Страница врача",
      actions.length === 0 ? "primary" : "secondary",
    );
  }

  if (hasOfficialClinicSite) {
    register(
      clinic.site_url,
      "Сайт клиники",
      actions.length === 0 ? "primary" : "secondary",
    );
  }

  if (clinic.booking_url && !isAggregatorHost(bookingHost)) {
    register(clinic.booking_url, "Записаться", actions.length === 0 ? "primary" : "secondary");
  }

  if (clinic.profile_url && !isAggregatorHost(profileHost)) {
    register(clinic.profile_url, "Профиль врача", actions.length === 0 ? "primary" : "secondary");
  }

  if (clinic.aggregator_booking_url) {
    register(clinic.aggregator_booking_url, "Запись через YDoc", "secondary");
  }

  if (clinic.booking_url && isAggregatorHost(bookingHost)) {
    register(clinic.booking_url, "Запись через YDoc", "secondary");
  }

  if (clinic.aggregator_profile_url) {
    register(clinic.aggregator_profile_url, "Карточка на YDoc", "secondary");
  }

  if (clinic.profile_url && isAggregatorHost(profileHost)) {
    register(clinic.profile_url, "Карточка на YDoc", "secondary");
  }

  if (clinic.site_url && isAggregatorHost(siteHost)) {
    register(clinic.site_url, "Клиника на YDoc", "secondary");
  }

  return actions;
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className="rounded-lg bg-surface p-4 text-center shadow-card">
      <div className="text-base font-bold text-text">{title}</div>
      <div className="mt-2 text-sm leading-6 text-subtle">{description}</div>
      {actionLabel && onAction ? (
        <div className="mt-4">
          <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>
        </div>
      ) : null}
    </section>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <section className="rounded-lg bg-surface p-4 shadow-card">
      <div className="text-sm font-semibold text-text">{label}</div>
      <div className="mt-3 space-y-2">
        <div className="h-4 rounded-pill bg-section" />
        <div className="h-4 w-5/6 rounded-pill bg-section" />
        <div className="h-4 w-4/6 rounded-pill bg-section" />
      </div>
    </section>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-lg bg-surface p-4 shadow-card">
      <div className="text-base font-bold text-text">{title}</div>
      <div className="mt-2 text-sm leading-6 text-subtle">{message}</div>
      <div className="mt-4">
        <PrimaryButton onClick={onRetry}>Повторить</PrimaryButton>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  actionLabel,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-link">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="mt-1 font-display text-lg font-bold text-sectionHeader">
          {title}
        </h2>
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-link"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function QuickActionCard({
  title,
  subtitle,
  badge,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="surface-card w-full rounded-lg px-3 py-3 text-left transition-transform duration-fast ease-standard hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-section text-link shadow-soft">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-display text-[17px] font-bold text-text">
              {title}
            </div>
            {badge ? (
              <div className="shrink-0 rounded-pill bg-section px-2 py-1 text-[11px] font-semibold text-subtle">
                {badge}
              </div>
            ) : null}
          </div>
          <div className="mt-1 text-[13px] leading-5 text-subtle">{subtitle}</div>
        </div>
      </div>
    </button>
  );
}

function FilterChip({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = active
    ? "bg-action text-actionText shadow-soft"
    : "bg-section text-text shadow-soft";

  if (!onClick) {
    return (
      <span
        className={`inline-flex items-center rounded-pill px-3 py-2 text-sm font-medium ${className}`}
      >
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-pill px-3 py-2 text-sm font-medium transition-transform duration-fast ease-standard hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link active:scale-[0.99] ${className}`}
    >
      {label}
    </button>
  );
}

function SpecialtySheet({
  open,
  selectedFilter,
  specialtySearch,
  onSearchChange,
  specialties,
  onClose,
  onSelect,
}: {
  open: boolean;
  selectedFilter: string;
  specialtySearch: string;
  onSearchChange: (value: string) => void;
  specialties: Array<{
    slug: string;
    name: string;
    count: number;
  }>;
  onClose: () => void;
  onSelect: (filter: string) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-overlay">
      <button
        aria-label="Закрыть выбор специальности"
        className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--tg-theme-text-color)_14%,transparent)]"
        type="button"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[420px] flex-col rounded-t-lg bg-surface p-3 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-link">
              Специальности
            </div>
            <div className="mt-1 text-sm text-subtle">
              Выберите направление и сразу перейдите к списку врачей
            </div>
          </div>
          <PrimaryButton
            aria-label="Закрыть"
            className="px-2"
            style="ghost"
            onClick={onClose}
          >
            <CloseIcon />
          </PrimaryButton>
        </div>

        <div className="mt-3 rounded-lg bg-section p-2 shadow-soft">
          <input
            aria-label="Поиск специальности"
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-hint"
            placeholder="Найти специальность"
            value={specialtySearch}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <div className="mt-3 max-h-[56dvh] space-y-2 overflow-y-auto pb-2">
          <button
            type="button"
            onClick={() => onSelect("Все")}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-transform duration-fast ease-standard hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link active:scale-[0.99] ${
              selectedFilter === "Все"
                ? "bg-action text-actionText shadow-soft"
                : "bg-section text-text shadow-soft"
            }`}
          >
            <span className="font-semibold">Все врачи</span>
            <span className="text-sm opacity-80">Каталог</span>
          </button>

          {specialties.map((specialty) => {
            const isActive = selectedFilter === specialty.name;

            return (
              <button
                key={specialty.slug}
                type="button"
                onClick={() => onSelect(specialty.name)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-transform duration-fast ease-standard hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link active:scale-[0.99] ${
                  isActive
                    ? "bg-action text-actionText shadow-soft"
                    : "bg-section text-text shadow-soft"
                }`}
              >
                <span className="font-semibold">{specialty.name}</span>
                <span className="text-sm opacity-80">
                  {specialty.count > 0 ? `${formatCount(specialty.count)} врачей` : "Каталог"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function openExternalLink(url: string) {
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
    telegram.WebApp.openLink(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export function CatalogApp({ initialScreen = "home" }: CatalogAppProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("Все");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [specialtySheetOpen, setSpecialtySheetOpen] = useState(false);
  const [specialtySearch, setSpecialtySearch] = useState("");

  const promotionsRef = useRef<HTMLElement | null>(null);

  const [doctorsReloadKey, setDoctorsReloadKey] = useState(0);
  const [promotionsReloadKey, setPromotionsReloadKey] = useState(0);
  const [overviewReloadKey, setOverviewReloadKey] = useState(0);

  const [doctorsStatus, setDoctorsStatus] = useState<LoadStatus>("loading");
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const [doctorList, setDoctorList] = useState<{
    total: number;
    items: DoctorCardData[];
  }>({ total: 0, items: [] });

  const [promotionsStatus, setPromotionsStatus] = useState<LoadStatus>("loading");
  const [promotionsError, setPromotionsError] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<
    Array<{
      id: string;
      clinic: string;
      title: string;
      deadline?: string;
    }>
  >([]);

  const [overviewStatus, setOverviewStatus] = useState<LoadStatus>("loading");
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overview, setOverview] = useState<CatalogOverview | null>(null);

  const [doctorDetails, setDoctorDetails] = useState<Record<string, DoctorDetailRecord>>({});
  const [detailState, setDetailState] = useState<DoctorDetailState>({
    doctorId: null,
    status: "idle",
    error: null,
  });

  const deferredQuery = useDeferredValue(query.trim());
  const allSpecialties =
    overview?.specialties.length && overview.specialties.length > 0
      ? overview.specialties
      : [...FALLBACK_SPECIALTIES];
  const popularSpecialties = allSpecialties.slice(0, 6);
  const visibleSheetSpecialties = allSpecialties.filter((specialty) => {
    if (!specialtySearch.trim()) {
      return true;
    }

    return normalizeText(specialty.name).includes(normalizeText(specialtySearch));
  });
  const activeFilterCount =
    (query.trim() ? 1 : 0) + (selectedFilter !== "Все" ? 1 : 0);

  const markDoctorsLoading = () => {
    setDoctorsStatus("loading");
    setDoctorsError(null);
  };

  const markPromotionsLoading = () => {
    setPromotionsStatus("loading");
    setPromotionsError(null);
  };

  useEffect(() => {
    const controller = new AbortController();

    fetchCatalogOverview(controller.signal)
      .then((response) => {
        setOverview(response);
        setOverviewStatus("success");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setOverviewStatus("error");
        setOverviewError(
          error instanceof Error ? error.message : "Не удалось загрузить обзор каталога",
        );
      });

    return () => controller.abort();
  }, [overviewReloadKey]);

  useEffect(() => {
    const controller = new AbortController();

    fetchDoctors({
      q: deferredQuery || undefined,
      specialty: selectedFilter === "Все" ? undefined : selectedFilter,
      page: 1,
      perPage: 24,
      signal: controller.signal,
    })
      .then((response) => {
        setDoctorList({
          total: response.total,
          items: response.items.map((item) => ({
            id: item.id,
            name: item.full_name,
            specialty: item.specialties[0] ?? "Специалист",
            clinic: item.clinics[0] ?? "Клиника уточняется",
            rating: item.rating_avg,
            reviewCount: item.reviews_count,
            nextSlot: null,
            promoTitle: item.promo_title,
            initials: toInitials(item.full_name),
          })),
        });
        setDoctorsStatus("success");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setDoctorsStatus("error");
        setDoctorsError(error instanceof Error ? error.message : "Не удалось загрузить врачей");
      });

    return () => controller.abort();
  }, [deferredQuery, doctorsReloadKey, selectedFilter]);

  useEffect(() => {
    const controller = new AbortController();

    fetchPromotions({
      page: 1,
      perPage: 6,
      signal: controller.signal,
    })
      .then((response) => {
        setPromotions(
          response.items.map((item) => ({
            id: item.id,
            clinic: item.clinic.name,
            title: item.title,
            deadline: formatDeadline(item.ends_at),
          })),
        );
        setPromotionsStatus("success");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setPromotionsStatus("error");
        setPromotionsError(error instanceof Error ? error.message : "Не удалось загрузить акции");
      });

    return () => controller.abort();
  }, [promotionsReloadKey]);

  useEffect(() => {
    if (screen !== "detail" || !selectedDoctorId || doctorDetails[selectedDoctorId]) {
      return;
    }

    const controller = new AbortController();

    fetchDoctorDetail(selectedDoctorId, controller.signal)
      .then((response) => {
        const aggregatedReviews = aggregateReviewSummary(
          response.item.reviews.map((item) => ({
            source_name: item.source_name,
            source_page_url: item.source_page_url,
            rating_avg: item.rating_avg,
            reviews_count: item.reviews_count,
          })),
        );

        setDoctorDetails((current) => ({
          ...current,
          [selectedDoctorId]: {
            id: response.item.id,
            full_name: response.item.full_name,
            description_short: response.item.description_short,
            specialties: response.item.specialties.map((item) => item.name),
            clinics: response.item.clinics.map((clinic) => ({
              id: clinic.id,
              name: clinic.name,
              address: clinic.address,
              site_url: clinic.site_url,
              booking_url: clinic.booking_url,
              profile_url: clinic.profile_url,
              official_booking_url: clinic.official_booking_url ?? null,
              official_profile_url: clinic.official_profile_url ?? null,
              aggregator_booking_url: clinic.aggregator_booking_url ?? null,
              aggregator_profile_url: clinic.aggregator_profile_url ?? null,
              verification_status: clinic.verification_status ?? null,
              verified_on_clinic_site: clinic.verified_on_clinic_site ?? false,
              last_verified_at: clinic.last_verified_at ?? null,
            })),
            promotions: response.item.promotions.map((promotion) => ({
              id: promotion.id,
              title: promotion.title,
              ends_at: promotion.ends_at,
              clinic_name: promotion.clinic.name,
              source_url: promotion.source_url,
            })),
            reviews: response.item.reviews.map((review) => ({
              source_name: review.source_name,
              source_page_url: review.source_page_url,
              rating_avg: review.rating_avg,
              reviews_count: review.reviews_count,
            })),
            rating_avg:
              response.item.rating_avg ?? aggregatedReviews.rating_avg,
            reviews_count:
              response.item.reviews_count ?? aggregatedReviews.reviews_count,
          },
        }));
        setDetailState({
          doctorId: selectedDoctorId,
          status: "success",
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setDetailState({
          doctorId: selectedDoctorId,
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Не удалось загрузить карточку врача",
        });
      });

    return () => controller.abort();
  }, [doctorDetails, screen, selectedDoctorId]);

  const selectedDoctor = selectedDoctorId ? doctorDetails[selectedDoctorId] ?? null : null;
  const selectedDoctorListItem =
    doctorList.items.find((item) => item.id === selectedDoctorId) ?? null;
  const selectedClinicLabel = selectedDoctor
    ? selectedDoctor.clinics.length > 1
      ? `${selectedDoctor.clinics.length} клиники`
      : selectedDoctor.clinics[0]?.name ?? selectedDoctorListItem?.clinic ?? "Medsearch"
    : selectedDoctorListItem?.clinic ?? "Medsearch";

  const retryDetail = () => {
    if (!selectedDoctorId) {
      return;
    }

    setDoctorDetails((current) => {
      const next = { ...current };
      delete next[selectedDoctorId];
      return next;
    });
    setDetailState({
      doctorId: selectedDoctorId,
      status: "loading",
      error: null,
    });
  };

  const focusSearchField = () => {
    if (typeof document === "undefined") {
      return;
    }

    document.getElementById("catalog-search")?.focus();
  };

  const scrollToPromotions = () => {
    promotionsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openList = ({
    filter,
    nextQuery,
  }: {
    filter?: string;
    nextQuery?: string;
  } = {}) => {
    markDoctorsLoading();

    if (filter !== undefined) {
      setSelectedFilter(filter);
    }

    if (nextQuery !== undefined) {
      setQuery(nextQuery);
    }

    setSpecialtySheetOpen(false);
    setSpecialtySearch("");
    setScreen("list");
  };

  const applySpecialtyFilter = (filter: string) => {
    openList({
      filter,
      nextQuery: "",
    });
  };

  const openDetail = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    setDetailState({
      doctorId,
      status: doctorDetails[doctorId] ? "success" : "loading",
      error: null,
    });
    setScreen("detail");
  };

  const resetFilters = () => {
    markDoctorsLoading();
    setSelectedFilter("Все");
    setQuery("");
    setSpecialtySheetOpen(false);
    setSpecialtySearch("");
  };

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col bg-page page-shell">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-2">
          {screen === "home" ? (
            <>
              <section className="rounded-lg bg-surface p-3 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-link">
                      Medsearch BY
                    </div>
                    <h1 className="mt-2 font-display text-[25px] font-bold leading-[1.05] text-text">
                      Быстрый поиск врача в Минске
                    </h1>
                    <p className="mt-2 text-sm leading-5 text-subtle">
                      Врач, клиника и акции — в одном каталоге без лишних шагов.
                    </p>
                  </div>
                  <div className="rounded-pill bg-section px-2 py-1 text-[11px] font-semibold text-subtle shadow-soft">
                    Минск
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-subtle">
                  <span className="rounded-pill bg-section px-3 py-2 shadow-soft">
                    <span className="font-semibold text-text">
                      {overview
                        ? formatCount(overview.doctors_total)
                        : doctorList.total > 0
                          ? formatCount(doctorList.total)
                          : "..."}
                    </span>{" "}
                    врачей
                  </span>
                  <span className="rounded-pill bg-section px-3 py-2 shadow-soft">
                    <span className="font-semibold text-text">
                      {overview ? formatCount(overview.clinics_total) : "..."}
                    </span>{" "}
                    клиники
                  </span>
                  <span className="rounded-pill bg-section px-3 py-2 shadow-soft">
                    <span className="font-semibold text-text">
                      {overview
                        ? formatCount(overview.promotions_total)
                        : promotions.length > 0
                          ? formatCount(promotions.length)
                          : "..."}
                    </span>{" "}
                    акция
                  </span>
                </div>
              </section>

              <SearchInput
                value={query}
                onChange={(nextValue) => {
                  markDoctorsLoading();
                  setQuery(nextValue);
                }}
                onSubmit={() => openList()}
                placeholder="Врач, специальность или клиника"
              />

              <section className="space-y-2">
                <SectionHeader title="Быстрый старт" />
                <div className="grid grid-cols-1 gap-2">
                  <QuickActionCard
                    title="Все врачи"
                    subtitle="Открыть полный каталог"
                    badge={overview ? `${formatCount(overview.doctors_total)}` : undefined}
                    icon={<ArrowRightIcon />}
                    onClick={() => openList({ filter: "Все", nextQuery: "" })}
                  />
                  <QuickActionCard
                    title="По специальности"
                    subtitle="Выбрать направление"
                    badge={`${allSpecialties.length}`}
                    icon={<SparkIcon />}
                    onClick={() => {
                      setSpecialtySearch("");
                      setSpecialtySheetOpen(true);
                    }}
                  />
                  <QuickActionCard
                    title="Горячие акции"
                    subtitle="Посмотреть скидки клиник"
                    badge={overview ? `${formatCount(overview.promotions_total)}` : undefined}
                    icon={<TicketIcon />}
                    onClick={scrollToPromotions}
                  />
                  <QuickActionCard
                    title="Умный поиск"
                    subtitle="Ввести врача или клинику"
                    icon={<SearchFocusIcon />}
                    onClick={focusSearchField}
                  />
                </div>
              </section>

              <section className="space-y-2">
                <SectionHeader
                  title="Часто ищут"
                  actionLabel="Все"
                  onAction={() => {
                    setSpecialtySearch("");
                    setSpecialtySheetOpen(true);
                  }}
                />

                {overviewStatus === "loading" ? (
                  <LoadingState label="Собираем популярные направления" />
                ) : null}

                {overviewStatus === "error" && overviewError ? (
                  <ErrorState
                    title="Не удалось загрузить направления"
                    message={overviewError}
                    onRetry={() => {
                      setOverviewStatus("loading");
                      setOverviewError(null);
                      setOverviewReloadKey((current) => current + 1);
                    }}
                  />
                ) : null}

                {overviewStatus !== "loading" && popularSpecialties.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {popularSpecialties.map((specialty) => (
                      <button
                        key={specialty.slug}
                        type="button"
                        onClick={() => applySpecialtyFilter(specialty.name)}
                        className="surface-card rounded-lg px-3 py-2 text-left transition-transform duration-fast ease-standard hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link active:scale-[0.99]"
                      >
                        <div className="text-[15px] font-bold text-text">
                          {specialty.name}
                        </div>
                        <div className="mt-1 text-xs text-subtle">
                          {specialty.count > 0
                            ? `${formatCount(specialty.count)} врачей`
                            : "Открыть подборку"}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>

              <section ref={promotionsRef} className="space-y-2">
                <SectionHeader
                  title="Горячие предложения"
                  actionLabel="Все врачи"
                  onAction={() => openList({ filter: "Все", nextQuery: "" })}
                />

                {promotionsStatus === "loading" ? (
                  <LoadingState label="Загружаем акции из облачного каталога" />
                ) : null}

                {promotionsStatus === "error" && promotionsError ? (
                  <ErrorState
                    title="Акции временно недоступны"
                    message={promotionsError}
                    onRetry={() => {
                      markPromotionsLoading();
                      setPromotionsReloadKey((current) => current + 1);
                    }}
                  />
                ) : null}

                {promotionsStatus === "success" && promotions.length === 0 ? (
                  <EmptyState
                    title="Акций пока нет"
                    description="Когда парсеры найдут свежие предложения, они появятся здесь автоматически."
                  />
                ) : null}

                {promotionsStatus === "success" && promotions.length > 0 ? (
                  <div className="space-y-2">
                    {promotions.map((promotion) => (
                      <PromoBadge key={promotion.id} {...promotion} />
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="rounded-lg bg-surface p-3 shadow-soft">
                <div className="text-sm font-semibold text-text">
                  Онлайн-каталог из облачной базы
                </div>
                <div className="mt-1 text-sm leading-5 text-subtle">
                  Откроем карточку врача, покажем клинику и переведем на оригинальную
                  запись без лишних шагов.
                </div>
                <div className="mt-2 text-xs text-hint">Создано @AI_Nikitka93</div>
              </section>
            </>
          ) : null}

          {screen === "list" ? (
            <>
              <header className="sticky top-0 z-sticky -mx-2 rounded-lg bg-header px-2 py-2 backdrop-blur">
                <div className="flex items-center gap-2">
                  <PrimaryButton
                    style="ghost"
                    className="px-2"
                    leadingIcon={<ArrowLeftIcon />}
                    onClick={() => setScreen("home")}
                  >
                    Назад
                  </PrimaryButton>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-lg font-bold text-text">
                      Найдено {doctorList.total} врачей
                    </div>
                    <div className="truncate text-xs text-subtle">
                      {selectedFilter === "Все"
                        ? "Весь каталог врачей"
                        : `Направление: ${selectedFilter}`}
                    </div>
                  </div>
                </div>
              </header>

              <SearchInput
                value={query}
                onChange={(nextValue) => {
                  markDoctorsLoading();
                  setQuery(nextValue);
                }}
                onSubmit={() => undefined}
                placeholder="Уточните врача, клинику или направление"
              />

              <section className="rounded-lg bg-surface p-3 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-link">
                      Фильтры
                    </div>
                  </div>
                  <div className="rounded-pill bg-section px-2 py-1 text-[11px] font-semibold text-subtle shadow-soft">
                    {activeFilterCount} актив.
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <FilterChip
                    active={selectedFilter !== "Все"}
                    label={
                      selectedFilter === "Все"
                        ? "Все специальности"
                        : selectedFilter
                    }
                    onClick={() => {
                      setSpecialtySearch("");
                      setSpecialtySheetOpen(true);
                    }}
                  />

                  {query.trim() ? (
                    <FilterChip
                      label={`Запрос: ${query.trim()}`}
                      onClick={focusSearchField}
                    />
                  ) : null}

                  {(query.trim() || selectedFilter !== "Все") ? (
                    <FilterChip label="Сбросить" onClick={resetFilters} />
                  ) : null}
                </div>
              </section>

              {doctorsStatus === "loading" && doctorList.items.length === 0 ? (
                <LoadingState label="Загружаем врачей из облачного каталога" />
              ) : null}

              {doctorsStatus === "loading" && doctorList.items.length > 0 ? (
                <div className="rounded-pill bg-section px-3 py-2 text-center text-xs font-medium text-subtle shadow-soft">
                  Обновляем список врачей...
                </div>
              ) : null}

              {doctorsStatus === "error" && doctorsError ? (
                <ErrorState
                  title="Не удалось загрузить врачей"
                  message={doctorsError}
                  onRetry={() => {
                    markDoctorsLoading();
                    setDoctorsReloadKey((current) => current + 1);
                  }}
                />
              ) : null}

              {doctorsStatus === "success" && doctorList.items.length === 0 ? (
                <EmptyState
                  title="Ничего не найдено"
                  description="Сбросьте фильтры или откройте весь каталог, чтобы увидеть больше врачей."
                  actionLabel="Сбросить фильтры"
                  onAction={resetFilters}
                />
              ) : null}

              {doctorList.items.length > 0 ? (
                <section className="space-y-3">
                  {doctorList.items.map((doctor) => (
                    <DoctorCard key={doctor.id} doctor={doctor} onSelect={openDetail} />
                  ))}
                </section>
              ) : null}
            </>
          ) : null}

          {screen === "detail" ? (
            <>
              <header className="flex items-center justify-between gap-2">
                <PrimaryButton
                  style="ghost"
                  className="px-2"
                  leadingIcon={<ArrowLeftIcon />}
                  onClick={() => setScreen("list")}
                >
                  Назад
                </PrimaryButton>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-link">
                  {selectedClinicLabel}
                </div>
              </header>

              {detailState.status === "loading" ? (
                <LoadingState label="Загружаем карточку врача" />
              ) : null}

              {detailState.status === "error" && detailState.error ? (
                <ErrorState
                  title="Карточка врача пока не открылась"
                  message={detailState.error}
                  onRetry={retryDetail}
                />
              ) : null}

              {detailState.status === "success" && selectedDoctor ? (
                <>
                  <section className="rounded-lg bg-section p-4 shadow-card">
                    <div className="flex items-start gap-3">
                      <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-surface font-display text-2xl font-bold text-accent shadow-soft">
                        {toInitials(selectedDoctor.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h1 className="font-display text-2xl font-bold leading-tight text-text">
                          {selectedDoctor.full_name}
                        </h1>
                        <p className="mt-1 text-sm text-subtle">
                          {selectedDoctor.specialties[0] ?? "Специалист"},{" "}
                          {selectedDoctor.description_short ??
                            "прием в частных клиниках Минска"}
                        </p>
                        <div className="mt-3">
                          <HaloRating
                            rating={selectedDoctor.rating_avg}
                            reviewCount={selectedDoctor.reviews_count}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-lg bg-surface p-3 shadow-card">
                    <h2 className="font-display text-lg font-bold text-sectionHeader">
                      Где принимает
                    </h2>
                    {selectedDoctor.clinics.length === 0 ? (
                      <div className="mt-3 text-sm text-subtle">
                        Клиники для этого врача еще не загружены.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {selectedDoctor.clinics.map((clinic) => {
                          const clinicActions = buildClinicActions(clinic);

                          return (
                            <div
                              key={clinic.id}
                              className="rounded-md bg-page px-3 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-text">
                                    {clinic.name}
                                  </div>
                                  <div className="mt-1 text-sm text-subtle">
                                    {clinic.address ?? "Адрес уточняется"}
                                  </div>
                                </div>
                                <ArrowRightIcon />
                              </div>

                              {clinicActions.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {clinicActions.map((action) => (
                                    <PrimaryButton
                                      key={action.key}
                                      className="min-h-9 px-3 py-2 text-xs"
                                      style={action.style}
                                      onClick={() => openExternalLink(action.url)}
                                    >
                                      {action.label}
                                    </PrimaryButton>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-3 text-xs text-subtle">
                                  Для этой клиники ссылка на запись пока не загружена.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="space-y-2">
                    <h2 className="font-display text-lg font-bold text-sectionHeader">
                      Отзывы по источникам
                    </h2>
                    {selectedDoctor.reviews.length === 0 ? (
                      <EmptyState
                        title="Отзывы еще не загружены"
                        description="Пока у этого врача нет source breakdown по отзывам."
                      />
                    ) : (
                      <div className="space-y-2">
                        {selectedDoctor.reviews.map((review) => (
                          <div
                            key={`${review.source_name}:${review.source_page_url}`}
                            className="rounded-lg bg-surface p-3 shadow-soft"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-text">
                                  {formatReviewSourceName(review.source_name)}
                                </div>
                                <div className="mt-1 text-sm text-subtle">
                                  {review.rating_avg !== null
                                    ? `Рейтинг ${review.rating_avg.toFixed(1)} • ${review.reviews_count} отзывов`
                                    : `${review.reviews_count} отзывов`}
                                </div>
                              </div>
                              <PrimaryButton
                                className="min-h-9 px-3 py-2 text-xs"
                                style="secondary"
                                onClick={() =>
                                  openExternalLink(review.source_page_url)
                                }
                              >
                                Открыть источник
                              </PrimaryButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-2">
                    <h2 className="font-display text-lg font-bold text-sectionHeader">
                      Акции
                    </h2>
                    {selectedDoctor.promotions.length === 0 ? (
                      <EmptyState
                        title="Акции не найдены"
                        description="Для этого врача пока нет активных акций в загруженных источниках."
                      />
                    ) : (
                      selectedDoctor.promotions.map((promotion) => (
                        <PromoBadge
                          key={promotion.id}
                          clinic={promotion.clinic_name}
                          title={promotion.title}
                          deadline={formatDeadline(promotion.ends_at)}
                        />
                      ))
                    )}
                  </section>

                  <section className="rounded-lg bg-surface p-3 text-sm leading-6 text-subtle shadow-soft">
                    Мы честно показываем, куда ведет каждая ссылка: на сайт клиники,
                    на запись через агрегатор или на карточку врача. Если врач
                    принимает в нескольких местах, выбирайте нужную клинику прямо
                    в этом блоке.
                  </section>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </main>

      <SpecialtySheet
        open={specialtySheetOpen}
        selectedFilter={selectedFilter}
        specialtySearch={specialtySearch}
        onSearchChange={setSpecialtySearch}
        specialties={visibleSheetSpecialties}
        onClose={() => {
          setSpecialtySheetOpen(false);
          setSpecialtySearch("");
        }}
        onSelect={applySpecialtyFilter}
      />
    </>
  );
}
