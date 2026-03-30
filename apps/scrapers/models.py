from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@dataclass(slots=True)
class ClinicRecord:
    source: str
    external_id: str
    name: str
    url: str
    site_url: str | None = None
    booking_url_official: str | None = None
    official_directory_url: str | None = None
    official_booking_widget_url: str | None = None
    source_type: str | None = None
    is_official: bool | None = None
    source_priority: int | None = None
    verification_status: str | None = None
    official_last_verified_at: str | None = None
    official_verification_notes: str | None = None
    address: str | None = None
    city: str = "Минск"
    source_url: str | None = None
    captured_at: str = field(default_factory=utc_now_iso)


@dataclass(slots=True)
class DoctorClinicLinkRecord:
    clinic_external_id: str
    relation_source_url: str | None = None
    booking_url: str | None = None
    profile_url: str | None = None
    official_booking_url: str | None = None
    official_profile_url: str | None = None
    aggregator_booking_url: str | None = None
    aggregator_profile_url: str | None = None
    source_type: str | None = None
    verification_status: str | None = None
    verified_on_clinic_site: bool | None = None
    last_verified_at: str | None = None
    confidence_score: float | None = None
    position_title: str | None = None


@dataclass(slots=True)
class DoctorRecord:
    source: str
    external_id: str
    full_name: str
    url: str
    specialty_names: list[str] = field(default_factory=list)
    clinic_external_ids: list[str] = field(default_factory=list)
    booking_url: str | None = None
    profile_url: str | None = None
    official_booking_url: str | None = None
    official_profile_url: str | None = None
    source_type: str | None = None
    verification_status: str | None = None
    verified_on_clinic_site: bool | None = None
    last_verified_at: str | None = None
    confidence_score: float | None = None
    clinic_links: list[DoctorClinicLinkRecord] = field(default_factory=list)
    source_url: str | None = None
    city: str = "Минск"
    captured_at: str = field(default_factory=utc_now_iso)


@dataclass(slots=True)
class PromotionRecord:
    source: str
    external_id: str
    title: str
    url: str
    clinic_external_id: str | None = None
    valid_until: str | None = None
    published_at: str | None = None
    source_url: str | None = None
    captured_at: str = field(default_factory=utc_now_iso)


@dataclass(slots=True)
class ReviewSummaryRecord:
    source: str
    subject_type: str
    subject_external_id: str
    rating_value: float | None
    review_count: int
    url: str
    source_url: str | None = None
    captured_at: str = field(default_factory=utc_now_iso)


@dataclass(slots=True)
class ScrapeReport:
    source: str
    status: str
    notes: list[str] = field(default_factory=list)
    doctors_found: int = 0
    clinics_found: int = 0
    promotions_found: int = 0
    review_summaries_found: int = 0
    started_at: str = field(default_factory=utc_now_iso)
    finished_at: str | None = None


@dataclass(slots=True)
class SourceBatch:
    source: str
    captured_at: str
    doctors: list[DoctorRecord] = field(default_factory=list)
    clinics: list[ClinicRecord] = field(default_factory=list)
    promotions: list[PromotionRecord] = field(default_factory=list)
    review_summaries: list[ReviewSummaryRecord] = field(default_factory=list)
    report: ScrapeReport | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["batch_version"] = 1
        return payload
