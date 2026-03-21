import { HaloRating } from "@/components/ui/halo-rating";
import { PromoBadge } from "@/components/ui/promo-badge";

export type DoctorCardData = {
  id: string;
  name: string;
  specialty: string;
  clinic: string;
  rating: number | null;
  reviewCount: number;
  nextSlot?: string | null;
  promoTitle?: string | null;
  initials: string;
};

type DoctorCardProps = {
  doctor: DoctorCardData;
  onSelect: (doctorId: string) => void;
};

export function DoctorCard({ doctor, onSelect }: DoctorCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(doctor.id)}
      className="surface-card w-full rounded-lg p-3 text-left transition-transform duration-fast ease-standard hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-section font-display text-base font-bold text-accent shadow-soft">
          {doctor.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-display text-base font-bold text-text">
                {doctor.name}
              </div>
              <div className="mt-1 text-sm text-subtle">
                {doctor.specialty} • {doctor.clinic}
              </div>
            </div>
            <HaloRating
              rating={doctor.rating}
              reviewCount={doctor.reviewCount}
              compact
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-section px-2 py-1 text-xs font-medium text-link">
              {doctor.nextSlot ?? "Открыть карточку"}
            </span>
            <span className="text-xs text-subtle">
              {doctor.reviewCount} отзывов
            </span>
          </div>
          {doctor.promoTitle ? (
            <div className="mt-3">
              <PromoBadge
                compact
                clinic={doctor.clinic}
                title={doctor.promoTitle}
              />
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
