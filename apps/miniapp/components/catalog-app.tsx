"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { fetchDoctorDetail, fetchDoctors, fetchPromotions } from "@/lib/api";
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
  }>;
  promotions: Array<{
    id: string;
    title: string;
    ends_at: string | null;
    clinic_name: string;
    source_url: string;
  }>;
  rating_avg: number | null;
  reviews_count: number;
};

type DoctorDetailState = {
  doctorId: string | null;
  status: LoadStatus;
  error: string | null;
};

const QUICK_FILTERS = ["Гинеколог", "УЗИ", "Дерматолог"] as const;

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

function toInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
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

  const [doctorsReloadKey, setDoctorsReloadKey] = useState(0);
  const [promotionsReloadKey, setPromotionsReloadKey] = useState(0);

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

  const [doctorDetails, setDoctorDetails] = useState<Record<string, DoctorDetailRecord>>({});
  const [detailState, setDetailState] = useState<DoctorDetailState>({
    doctorId: null,
    status: "idle",
    error: null,
  });

  const deferredQuery = useDeferredValue(query.trim());

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
        const latestReview = response.item.reviews[0] ?? null;

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
            })),
            promotions: response.item.promotions.map((promotion) => ({
              id: promotion.id,
              title: promotion.title,
              ends_at: promotion.ends_at,
              clinic_name: promotion.clinic.name,
              source_url: promotion.source_url,
            })),
            rating_avg: latestReview?.rating_avg ?? null,
            reviews_count: latestReview?.reviews_count ?? 0,
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
  const selectedClinicName =
    selectedDoctor?.clinics[0]?.name ?? selectedDoctorListItem?.clinic ?? "Medsearch";

  const selectedBookingCandidate =
    selectedDoctor?.clinics.find(
      (clinic) => clinic.booking_url || clinic.site_url || clinic.profile_url,
    ) ?? null;
  const selectedBookingUrl =
    selectedBookingCandidate?.booking_url ??
    selectedBookingCandidate?.site_url ??
    selectedBookingCandidate?.profile_url ??
    null;

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

  const openList = (filter?: string) => {
    markDoctorsLoading();

    if (filter) {
      setSelectedFilter(filter);
      setQuery("");
    }

    setScreen("list");
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
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col bg-page page-shell">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-3">
        {screen === "home" ? (
          <>
            <section className="rounded-lg bg-section p-3 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-link">
                  Medsearch BY
                </div>
                <div className="rounded-pill bg-surface px-2 py-1 text-[11px] font-semibold text-subtle">
                  Минск
                </div>
              </div>
              <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.1] text-text">
                Найдите врача в Минске без хаоса
              </h1>
              <p className="mt-1 text-sm leading-6 text-subtle">
                Сравните отзывы, клиники и акции из live API за пару минут.
              </p>
            </section>

            <SearchInput
              value={query}
              onChange={(nextValue) => {
                markDoctorsLoading();
                setQuery(nextValue);
              }}
              onSubmit={() => openList()}
            />

            <section className="scroll-no-bar flex gap-2 overflow-x-auto pb-1">
              <PrimaryButton
                style={selectedFilter === "Все" ? "primary" : "secondary"}
                onClick={resetFilters}
              >
                Все
              </PrimaryButton>
              {QUICK_FILTERS.map((filter) => (
                <PrimaryButton
                  key={filter}
                  style={selectedFilter === filter ? "primary" : "secondary"}
                  onClick={() => openList(filter)}
                >
                  {filter}
                </PrimaryButton>
              ))}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-sectionHeader">
                  Горячие акции
                </h2>
                <button
                  type="button"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-link"
                  onClick={() => openList()}
                >
                  Все врачи
                </button>
              </div>

              {promotionsStatus === "loading" ? (
                <LoadingState label="Загружаем акции из Worker API" />
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

            <section className="rounded-lg bg-surface p-3 shadow-card">
              <div className="text-sm font-semibold text-text">
                Реальные данные через Worker API
              </div>
              <div className="mt-1 text-sm leading-6 text-subtle">
                Врачи и акции приходят через Cloudflare Worker, а запись открывается на
                оригинальном сайте клиники.
              </div>
              <div className="mt-2 text-xs text-hint">Создано @AI_Nikitka93</div>
              <div className="mt-3">
                <PrimaryButton
                  fullWidth
                  trailingIcon={<ArrowRightIcon />}
                  onClick={() => openList()}
                >
                  Смотреть врачей
                </PrimaryButton>
              </div>
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
                    {selectedFilter === "Все" ? "Все специальности" : selectedFilter}
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
            />

            <div className="scroll-no-bar flex gap-2 overflow-x-auto pb-1">
              <PrimaryButton
                style={selectedFilter === "Все" ? "primary" : "secondary"}
                onClick={resetFilters}
              >
                Все
              </PrimaryButton>
              {QUICK_FILTERS.map((filter) => (
                <PrimaryButton
                  key={filter}
                  style={selectedFilter === filter ? "primary" : "secondary"}
                  onClick={() => {
                    markDoctorsLoading();
                    setSelectedFilter(filter);
                  }}
                >
                  {filter}
                </PrimaryButton>
              ))}
            </div>

            {doctorsStatus === "loading" ? (
              <LoadingState label="Загружаем врачей из Worker API" />
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
                description="Попробуйте другой запрос или сбросьте фильтры, чтобы увидеть больше врачей."
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
                {selectedClinicName}
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
                      {selectedDoctor.clinics.map((clinic) => (
                        <div
                          key={clinic.id}
                          className="flex items-center justify-between gap-3 rounded-md bg-page px-3 py-3"
                        >
                          <div>
                            <div className="text-sm font-semibold text-text">
                              {clinic.name}
                            </div>
                            <div className="text-sm text-subtle">
                              {clinic.address ?? "Адрес уточняется"}
                            </div>
                          </div>
                          <ArrowRightIcon />
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
                  Запись происходит на оригинальном сайте клиники. Мы помогаем
                  выбрать врача и быстро перейти к записи.
                </section>

                <div className="sticky bottom-0 z-sticky mt-auto rounded-lg bg-bottomBar p-3 shadow-card backdrop-blur">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs text-subtle">
                    <span>Переход на сайт клиники</span>
                    <span className="font-semibold text-text">
                      {selectedClinicName}
                    </span>
                  </div>
                  <PrimaryButton
                    fullWidth
                    trailingIcon={<ArrowRightIcon />}
                    disabled={!selectedBookingUrl}
                    onClick={() => {
                      if (selectedBookingUrl) {
                        openExternalLink(selectedBookingUrl);
                      }
                    }}
                  >
                    {selectedBookingUrl
                      ? "Записаться на сайте клиники"
                      : "Ссылка на запись появится позже"}
                  </PrimaryButton>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
