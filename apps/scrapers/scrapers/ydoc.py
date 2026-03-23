from __future__ import annotations

import json
import math
import os
import re
from html import unescape
from urllib.parse import urldefrag, urlparse

from apps.scrapers.models import (
    ClinicRecord,
    DoctorClinicLinkRecord,
    DoctorRecord,
    ReviewSummaryRecord,
)
from apps.scrapers.scrapers.base import BaseScraper


class YDocScraper(BaseScraper):
    source_name = "ydoc"
    base_url = "https://ydoc.by"
    page_size = 20
    allowed_seed_urls = (
        "https://ydoc.by/minsk/vrach/",
        "https://ydoc.by/minsk/klinika/",
    )

    def __init__(self, client, config) -> None:
        super().__init__(client, config)
        self._clinic_cache: dict[str, ClinicRecord] = {}

    def collect(self):
        batch = self.empty_batch()
        response = self.client.get_text(self.absolute_url("/minsk/vrach/"), referer=self.base_url)
        soup = self.soup(response.text)

        specialty_pages = self._extract_specialty_pages(soup)
        if not specialty_pages:
            specialty_pages = [(self.absolute_url("/minsk/vrach/"), None, self.page_size)]
        specialty_pages = self._apply_specialty_window(specialty_pages)

        doctor_map: dict[str, DoctorRecord] = {}
        review_map: dict[str, ReviewSummaryRecord] = {}
        clinic_map: dict[str, ClinicRecord] = {}

        for specialty_url, specialty_name, doctor_count in specialty_pages:
            total_pages = max(1, math.ceil(max(doctor_count, 1) / self.page_size))
            for page in range(1, total_pages + 1):
                if doctor_map and self.doctor_limit_reached(len(doctor_map)):
                    break

                page_url = specialty_url if page == 1 else f"{specialty_url}?page={page}"
                if doctor_map or page > 1:
                    self.polite_sleep()

                page_response = self.client.get_text(page_url, referer=specialty_url)
                page_soup = self.soup(page_response.text)
                cards = page_soup.select("div.b-doctor-card")

                if not cards:
                    break

                for card in cards:
                    doctor, review, clinics = self._extract_doctor_from_card(
                        card,
                        specialty_hint=specialty_name,
                    )
                    if not doctor or not review:
                        continue

                    existing_doctor = doctor_map.get(doctor.external_id)
                    if existing_doctor:
                        existing_doctor.specialty_names = self._merge_values(
                            existing_doctor.specialty_names,
                            doctor.specialty_names,
                        )
                        existing_doctor.clinic_external_ids = self._merge_values(
                            existing_doctor.clinic_external_ids,
                            doctor.clinic_external_ids,
                        )
                        existing_doctor.clinic_links = self._merge_clinic_links(
                            existing_doctor.clinic_links,
                            doctor.clinic_links,
                        )
                    else:
                        self.polite_sleep()
                        doctor, detail_clinics, detail_rating_value, detail_review_count = self._enrich_doctor_from_detail(doctor)
                        if detail_rating_value is not None:
                            review.rating_value = detail_rating_value
                        if detail_review_count and detail_review_count > 0:
                            review.review_count = max(review.review_count, detail_review_count)
                            if review.review_count <= 0:
                                review.rating_value = None
                        doctor_map[doctor.external_id] = doctor
                        clinics = self._merge_clinics(clinics, detail_clinics)

                    existing_review = review_map.get(review.subject_external_id)
                    if existing_review:
                        existing_review.review_count = max(existing_review.review_count, review.review_count)
                        if existing_review.rating_value is None and review.rating_value is not None:
                            existing_review.rating_value = review.rating_value
                    else:
                        review_map[review.subject_external_id] = review

                    for clinic in clinics:
                        clinic_map[clinic.external_id] = clinic

                    if self.doctor_limit_reached(len(doctor_map)):
                        break

        batch.doctors.extend(doctor_map.values())
        batch.review_summaries.extend(review_map.values())
        batch.clinics.extend(clinic_map.values())
        return batch

    def _extract_specialty_pages(self, soup) -> list[tuple[str, str | None, int]]:
        specialty_pages: list[tuple[str, str | None, int]] = []
        seen_urls: set[str] = set()

        for item in soup.select(".p-doctors-list-page__tab-item"):
            link = item.select_one("a[href]")
            if not link:
                continue

            href = link.get("href", "")
            if not href.startswith("/minsk/") or "/vrach/" in href:
                continue

            specialty_url = self.absolute_url(href)
            if specialty_url in seen_urls:
                continue

            seen_urls.add(specialty_url)
            count_text = self.normalize_space(
                item.select_one(".p-doctors-list-page__tab-item-count").get_text()
                if item.select_one(".p-doctors-list-page__tab-item-count")
                else ""
            )
            doctor_count = int(re.sub(r"[^\d]", "", count_text) or "0")
            specialty_name = self.normalize_space(link.get_text())
            specialty_pages.append((specialty_url, specialty_name or None, doctor_count))

        return specialty_pages

    def _apply_specialty_window(
        self,
        specialty_pages: list[tuple[str, str | None, int]],
    ) -> list[tuple[str, str | None, int]]:
        raw_json = os.environ.get("YDOC_SPECIALTY_URLS_JSON", "").strip()
        if raw_json:
            try:
                selected_urls = {
                    self.absolute_url(url.strip())
                    for url in json.loads(raw_json)
                    if isinstance(url, str) and url.strip()
                }
            except json.JSONDecodeError:
                selected_urls = set()

            if selected_urls:
                filtered = [page for page in specialty_pages if page[0] in selected_urls]
                if filtered:
                    return filtered

        offset = self.env_int("YDOC_SPECIALTY_OFFSET", default=0, minimum=0)
        limit = self.env_int("YDOC_SPECIALTY_LIMIT", default=0, minimum=0)
        sliced = specialty_pages[offset:]
        if limit > 0:
            sliced = sliced[:limit]
        return sliced or specialty_pages

    def _extract_doctor_from_card(self, card, specialty_hint: str | None):
        doctor_url = self._extract_doctor_url(card)
        doctor_id = self.normalize_space(card.get("data-doctor-id"))
        full_name = self._extract_full_name(card)

        if not doctor_url or not doctor_id or not full_name:
            return None, None, []

        specialty_names = self._extract_specialties(card, specialty_hint)
        clinic_records = self._extract_clinics_from_card(card)
        clinic_ids = [clinic.external_id for clinic in clinic_records]
        review_count = self._extract_review_count(self.normalize_space(card.get_text(" ", strip=True)))
        rating_value = self._extract_card_rating(card)
        if review_count <= 0:
            rating_value = None

        doctor = DoctorRecord(
            source=self.source_name,
            external_id=doctor_id,
            full_name=full_name,
            url=doctor_url,
            booking_url=doctor_url,
            profile_url=doctor_url,
            source_type="aggregator",
            verification_status="aggregator_only",
            verified_on_clinic_site=False,
            confidence_score=0.4,
            specialty_names=specialty_names or ["Не указано"],
            clinic_external_ids=clinic_ids,
            clinic_links=[
                DoctorClinicLinkRecord(
                    clinic_external_id=clinic.external_id,
                    relation_source_url=doctor_url,
                    booking_url=doctor_url,
                    profile_url=doctor_url,
                    aggregator_booking_url=doctor_url,
                    aggregator_profile_url=doctor_url,
                    source_type="aggregator",
                    verification_status="aggregator_only",
                    verified_on_clinic_site=False,
                    confidence_score=0.4,
                )
                for clinic in clinic_records
            ],
            source_url=doctor_url,
        )
        review = ReviewSummaryRecord(
            source=self.source_name,
            subject_type="doctor",
            subject_external_id=doctor_id,
            rating_value=rating_value,
            review_count=review_count,
            url=doctor_url,
            source_url=doctor_url,
        )
        return doctor, review, clinic_records

    def _enrich_doctor_from_detail(
        self,
        doctor: DoctorRecord,
    ) -> tuple[DoctorRecord, list[ClinicRecord], float | None, int | None]:
        response = self.client.get_text(doctor.url, referer=self.absolute_url("/minsk/vrach/"))
        detail_clinics = self._extract_clinics_from_detail(response.text)
        detail_rating_value, detail_review_count = self._extract_review_summary_from_detail(response.text)
        clinic_external_ids = self._merge_values(
            doctor.clinic_external_ids,
            [clinic.external_id for clinic in detail_clinics],
        )
        clinic_links = self._merge_clinic_links(
            doctor.clinic_links,
            [
                DoctorClinicLinkRecord(
                    clinic_external_id=clinic.external_id,
                    relation_source_url=response.url,
                    booking_url=doctor.url,
                    profile_url=doctor.url,
                    aggregator_booking_url=doctor.url,
                    aggregator_profile_url=doctor.url,
                    source_type="aggregator",
                    verification_status="aggregator_only",
                    verified_on_clinic_site=False,
                    confidence_score=0.45,
                )
                for clinic in detail_clinics
            ],
        )
        enriched_doctor = DoctorRecord(
            source=doctor.source,
            external_id=doctor.external_id,
            full_name=doctor.full_name,
            url=doctor.url,
            booking_url=doctor.booking_url,
            profile_url=response.url,
            official_booking_url=doctor.official_booking_url,
            official_profile_url=doctor.official_profile_url,
            source_type=doctor.source_type,
            verification_status=doctor.verification_status,
            verified_on_clinic_site=doctor.verified_on_clinic_site,
            last_verified_at=doctor.last_verified_at,
            confidence_score=doctor.confidence_score,
            specialty_names=doctor.specialty_names,
            clinic_external_ids=clinic_external_ids,
            clinic_links=clinic_links,
            source_url=response.url,
            city=doctor.city,
            captured_at=doctor.captured_at,
        )
        return enriched_doctor, detail_clinics, detail_rating_value, detail_review_count

    def _extract_clinics(self, soup, html: str) -> list[ClinicRecord]:
        clinics: dict[str, ClinicRecord] = {}
        for link in soup.select("a[href*='/minsk/lpu/'], a[href*='/minsk/klinika/']"):
            href = link.get("href", "")
            name = self.normalize_space(link.get_text())
            if not href or len(name) < 3:
                continue
            clinic_url, _ = urldefrag(self.absolute_url(href))
            clinic_slug = urlparse(clinic_url).path.rstrip("/").split("/")[-1]
            clinics[clinic_slug] = ClinicRecord(
                source=self.source_name,
                external_id=f"ydoc-clinic-{clinic_slug}",
                name=name,
                url=clinic_url,
            )
        for match in re.finditer(r'"lpu_id":\s*"?(?P<id>\d+)"?', html):
            clinic_id = match.group("id")
            clinics.setdefault(
                f"ydoc-lpu-{clinic_id}",
                ClinicRecord(
                    source=self.source_name,
                    external_id=f"ydoc-lpu-{clinic_id}",
                    name=f"YDoc clinic {clinic_id}",
                    url=self.absolute_url("/minsk/klinika/"),
                ),
            )
        return list(clinics.values())

    def _extract_review_count(self, text: str) -> int:
        match = re.search(r"(\d+)\s+отзыв", text, re.IGNORECASE)
        return int(match.group(1)) if match else 0

    def _extract_rating_value(self, html: str) -> float | None:
        for pattern in (
            r'(?:\"|&quot;)official_rating(?:\"|&quot;):\s*(\d+(?:\.\d+)?)',
            r'(?:\"|&quot;)rating(?:\"|&quot;):\s*(\d+(?:\.\d+)?)',
            r'(?:\"|&quot;)stars(?:\"|&quot;):\s*(\d+(?:\.\d+)?)',
        ):
            match = re.search(pattern, html)
            if match:
                return float(match.group(1))
        return None

    def _extract_doctor_url(self, card) -> str | None:
        doctor_link = card.select_one("a[href*='/minsk/vrach/']")
        if not doctor_link or not doctor_link.get("href"):
            return None
        doctor_url, _ = urldefrag(self.absolute_url(doctor_link["href"]))
        return doctor_url

    def _extract_full_name(self, card) -> str:
        payload = self._parse_card_payload(card)
        full_name = self.normalize_space(payload.get("doctors", {}).get("doctorFio", ""))
        if full_name:
            return full_name

        title_node = card.select_one(".b-doctor-card__name-surname")
        if title_node:
            return self.normalize_space(title_node.get_text())

        fallback_name = self.normalize_space(card.get("data-doctor-name"))
        return fallback_name

    def _extract_specialties(self, card, specialty_hint: str | None) -> list[str]:
        specialties = [
            self.normalize_space(part)
            for part in card.select_one(".b-doctor-card__spec").get_text(", ", strip=True).split(",")
        ] if card.select_one(".b-doctor-card__spec") else []

        cleaned = [specialty for specialty in specialties if specialty]
        if specialty_hint and specialty_hint not in cleaned:
            cleaned.append(specialty_hint)
        return self._merge_values([], cleaned)

    def _extract_clinics_from_card(self, card) -> list[ClinicRecord]:
        clinics: list[ClinicRecord] = []
        for option in card.select(".b-doctor-card__lpu-select option"):
            lpu_id = self.normalize_space(option.get("data-lpu"))
            clinic_name = self.normalize_space(option.get_text())
            if not lpu_id or not clinic_name:
                continue

            clinics.append(
                ClinicRecord(
                    source=self.source_name,
                    external_id=f"ydoc-lpu-{lpu_id}",
                    name=clinic_name,
                    url=self.absolute_url(f"/minsk/lpu/{lpu_id}/"),
                    source_type="aggregator",
                    is_official=False,
                    source_priority=100,
                    )
            )

        return clinics

    def _extract_clinics_from_detail(self, html: str) -> list[ClinicRecord]:
        payloads = self._parse_lpu_address_list(html)
        clinics: list[ClinicRecord] = []
        for payload in payloads:
            clinic = self._build_clinic_from_detail_payload(payload)
            if clinic:
                clinics.append(clinic)
        return clinics

    def _parse_lpu_address_list(self, html: str) -> list[dict]:
        match = re.search(r':lpu-address-list="(?P<payload>\[.*?\])"', html, re.DOTALL)
        if not match:
            return []

        raw_payload = unescape(match.group("payload"))
        try:
            data = json.loads(raw_payload)
        except json.JSONDecodeError:
            return []

        return data if isinstance(data, list) else []

    def _build_clinic_from_detail_payload(self, payload: dict) -> ClinicRecord | None:
        lpu = payload.get("lpu", {}) if isinstance(payload.get("lpu"), dict) else {}
        lpu_id = payload.get("lpu_id") or lpu.get("id") or payload.get("id")
        if not lpu_id:
            return None

        clinic_external_id = f"ydoc-lpu-{lpu_id}"
        cached = self._clinic_cache.get(clinic_external_id)
        if cached:
            return cached

        translit = self.normalize_space(lpu.get("translit"))
        clinic_url = self._build_lpu_url(str(lpu_id), translit)
        clinic_name = self.normalize_space(lpu.get("name")) or f"YDoc clinic {lpu_id}"
        address = self.normalize_space(payload.get("address") or lpu.get("address"))
        clinic = ClinicRecord(
            source=self.source_name,
            external_id=clinic_external_id,
            name=clinic_name,
            url=clinic_url,
            address=address or None,
            source_type="aggregator",
            is_official=False,
            source_priority=100,
            verification_status="unverified",
            source_url=clinic_url,
        )
        enriched = self._enrich_clinic_from_ydoc_page(clinic)
        self._clinic_cache[clinic_external_id] = enriched
        return enriched

    def _enrich_clinic_from_ydoc_page(self, clinic: ClinicRecord) -> ClinicRecord:
        self.polite_sleep()
        try:
            response = self.client.get_text(clinic.url, referer=clinic.url)
        except Exception:
            return clinic

        soup = self.soup(response.text)

        official_site = None
        meta_url = soup.select_one("meta[itemprop='url'][content]")
        if meta_url:
            candidate = self.normalize_space(meta_url.get("content"))
            if candidate and "ydoc.by" not in candidate:
                official_site = candidate

        address = clinic.address
        address_meta = soup.select_one("[itemprop='address']")
        if address_meta:
            parsed_address = self.normalize_space(address_meta.get_text(" ", strip=True))
            if parsed_address:
                address = parsed_address

        return ClinicRecord(
            source=clinic.source,
            external_id=clinic.external_id,
            name=clinic.name,
            url=response.url,
            site_url=official_site,
            source_type="aggregator",
            is_official=False,
            source_priority=100,
            verification_status="unverified",
            official_verification_notes="official site linked from ydoc clinic page" if official_site else None,
            address=address,
            city=clinic.city,
            source_url=response.url,
            captured_at=clinic.captured_at,
        )

    def _build_lpu_url(self, lpu_id: str, translit: str) -> str:
        slug = translit.strip("-")
        if slug:
            prefix = f"{lpu_id}-"
            if slug.startswith(prefix):
                return self.absolute_url(f"/minsk/lpu/{slug}/")
            return self.absolute_url(f"/minsk/lpu/{lpu_id}-{slug}/")
        return self.absolute_url(f"/minsk/lpu/{lpu_id}/")

    def _extract_card_rating(self, card) -> float | None:
        progress = card.select_one(".b-stars-rate__progress")
        style = progress.get("style", "") if progress else ""
        match = re.search(r"width:\s*(\d+(?:\.\d+)?)em", style)
        if not match:
            return None

        width_em = float(match.group(1))
        if width_em <= 0:
            return None

        rating = round((width_em / 8.0) * 5.0, 1)
        if rating < 0 or rating > 5.0:
            return None
        return rating

    def _extract_review_summary_from_detail(self, html: str) -> tuple[float | None, int | None]:
        soup = self.soup(html)

        rating_value = None
        rating_node = soup.select_one(".doctor-rating .text-h5")
        if rating_node:
            rating_match = re.search(r"(\d+(?:\.\d+)?)", rating_node.get_text(" ", strip=True))
            if rating_match:
                candidate = float(rating_match.group(1))
                if 0 < candidate <= 5:
                    rating_value = candidate

        review_count = None
        for pattern in (
            r'ratingCount[^0-9]*(\d+)',
            r'(\d+)\s+отзыв',
        ):
            match = re.search(pattern, html, re.IGNORECASE)
            if not match:
                continue
            candidate = int(match.group(1))
            if candidate >= 0:
                review_count = candidate
                break

        if review_count is not None and review_count <= 0:
            rating_value = None

        return rating_value, review_count

    def _parse_card_payload(self, card) -> dict:
        raw = card.get("data-schedule-item", "").strip()
        if not raw:
            return {}

        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}

    def _merge_values(self, current: list[str], incoming: list[str]) -> list[str]:
        merged: list[str] = []
        seen: set[str] = set()
        for value in current + incoming:
            normalized = self.normalize_space(value)
            if not normalized:
                continue
            key = normalized.casefold()
            if key in seen:
                continue
            seen.add(key)
            merged.append(normalized)
        return merged

    def _merge_clinics(
        self,
        current: list[ClinicRecord],
        incoming: list[ClinicRecord],
    ) -> list[ClinicRecord]:
        merged: dict[str, ClinicRecord] = {}
        for clinic in current + incoming:
            existing = merged.get(clinic.external_id)
            if not existing:
                merged[clinic.external_id] = clinic
                continue
            merged[clinic.external_id] = ClinicRecord(
                source=clinic.source,
                external_id=clinic.external_id,
                name=clinic.name or existing.name,
                url=clinic.url or existing.url,
                site_url=clinic.site_url or existing.site_url,
                booking_url_official=clinic.booking_url_official or existing.booking_url_official,
                official_directory_url=clinic.official_directory_url or existing.official_directory_url,
                official_booking_widget_url=clinic.official_booking_widget_url or existing.official_booking_widget_url,
                source_type=clinic.source_type or existing.source_type,
                is_official=clinic.is_official if clinic.is_official is not None else existing.is_official,
                source_priority=clinic.source_priority or existing.source_priority,
                verification_status=clinic.verification_status or existing.verification_status,
                official_last_verified_at=clinic.official_last_verified_at or existing.official_last_verified_at,
                official_verification_notes=clinic.official_verification_notes or existing.official_verification_notes,
                address=clinic.address or existing.address,
                city=clinic.city or existing.city,
                source_url=clinic.source_url or existing.source_url,
                captured_at=clinic.captured_at or existing.captured_at,
            )
        return list(merged.values())

    def _merge_clinic_links(
        self,
        current: list[DoctorClinicLinkRecord],
        incoming: list[DoctorClinicLinkRecord],
    ) -> list[DoctorClinicLinkRecord]:
        merged: dict[str, DoctorClinicLinkRecord] = {}
        for link in current + incoming:
            existing = merged.get(link.clinic_external_id)
            if not existing:
                merged[link.clinic_external_id] = link
                continue
            merged[link.clinic_external_id] = DoctorClinicLinkRecord(
                clinic_external_id=link.clinic_external_id,
                relation_source_url=link.relation_source_url or existing.relation_source_url,
                booking_url=link.booking_url or existing.booking_url,
                profile_url=link.profile_url or existing.profile_url,
                official_booking_url=link.official_booking_url or existing.official_booking_url,
                official_profile_url=link.official_profile_url or existing.official_profile_url,
                aggregator_booking_url=link.aggregator_booking_url or existing.aggregator_booking_url,
                aggregator_profile_url=link.aggregator_profile_url or existing.aggregator_profile_url,
                source_type=link.source_type or existing.source_type,
                verification_status=link.verification_status or existing.verification_status,
                verified_on_clinic_site=(
                    link.verified_on_clinic_site
                    if link.verified_on_clinic_site is not None
                    else existing.verified_on_clinic_site
                ),
                last_verified_at=link.last_verified_at or existing.last_verified_at,
                confidence_score=link.confidence_score or existing.confidence_score,
                position_title=link.position_title or existing.position_title,
            )
        return list(merged.values())
