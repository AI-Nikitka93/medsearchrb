from __future__ import annotations

import json
import math
import re
from urllib.parse import urldefrag, urlparse

from apps.scrapers.models import ClinicRecord, DoctorRecord, ReviewSummaryRecord
from apps.scrapers.scrapers.base import BaseScraper


class YDocScraper(BaseScraper):
    source_name = "ydoc"
    base_url = "https://ydoc.by"
    page_size = 20
    allowed_seed_urls = (
        "https://ydoc.by/minsk/vrach/",
        "https://ydoc.by/minsk/klinika/",
    )

    def collect(self):
        batch = self.empty_batch()
        response = self.client.get_text(self.absolute_url("/minsk/vrach/"), referer=self.base_url)
        soup = self.soup(response.text)

        specialty_pages = self._extract_specialty_pages(soup)
        if not specialty_pages:
            specialty_pages = [(self.absolute_url("/minsk/vrach/"), None, self.page_size)]

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
                    self.client.sleep_with_jitter()

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
                    else:
                        doctor_map[doctor.external_id] = doctor

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

        doctor = DoctorRecord(
            source=self.source_name,
            external_id=doctor_id,
            full_name=full_name,
            url=doctor_url,
            specialty_names=specialty_names or ["Не указано"],
            clinic_external_ids=clinic_ids,
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
                    url=self.absolute_url("/minsk/klinika/"),
                )
            )

        return clinics

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
