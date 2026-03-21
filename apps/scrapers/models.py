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
    address: str | None = None
    city: str = "Минск"
    source_url: str | None = None
    captured_at: str = field(default_factory=utc_now_iso)


@dataclass(slots=True)
class DoctorRecord:
    source: str
    external_id: str
    full_name: str
    url: str
    specialty_names: list[str]
    clinic_external_ids: list[str]
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
