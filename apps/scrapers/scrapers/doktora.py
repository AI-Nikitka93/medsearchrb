from __future__ import annotations

import re
from urllib.parse import urlparse

from apps.scrapers.models import (
    ClinicRecord,
    DoctorClinicLinkRecord,
    DoctorRecord,
    ReviewSummaryRecord,
)
from apps.scrapers.scrapers.base import BaseScraper


class DoktoraScraper(BaseScraper):
    source_name = "doktora.by"
    base_url = "https://doktora.by"
    allowed_seed_urls = (
        "https://doktora.by/otzyvy-o-vrachah-belarusi",
        "https://doktora.by/otzyvy/hirurg-v-minske-alekseev-sergey-alekseevich",
    )

    def collect(self):
        batch = self.empty_batch()
        doctor_urls = self._collect_doctor_urls()
        clinic_map: dict[str, ClinicRecord] = {}

        for doctor_url in self.trim_doctor_urls(doctor_urls):
            if batch.doctors:
                self.polite_sleep()

            doctor, review, clinic = self._extract_doctor(doctor_url)
            if not doctor or not review:
                continue

            batch.doctors.append(doctor)
            batch.review_summaries.append(review)
            if clinic:
                clinic_map[clinic.external_id] = clinic

        batch.clinics.extend(clinic_map.values())
        return batch

    def _collect_doctor_urls(self) -> list[str]:
        first_page_url = self.absolute_url("/otzyvy-o-vrachah-belarusi?page=1")
        response = self.client.get_text(first_page_url, referer=self.base_url)
        soup = self.soup(response.text)
        total_pages = self._extract_last_page(soup)

        candidates: list[str] = []
        for page in range(1, total_pages + 1):
            if self.doctor_limit_reached(len(self.unique_urls(candidates))):
                break

            page_url = first_page_url if page == 1 else self.absolute_url(f"/otzyvy-o-vrachah-belarusi?page={page}")
            if page > 1:
                self.polite_sleep()
                response = self.client.get_text(page_url, referer=first_page_url)
                soup = self.soup(response.text)

            for link in soup.select("a[href*='/otzyvy/']"):
                href = link.get("href", "")
                if "/otzyvy/" not in href:
                    continue
                if "-v-minske-" not in href:
                    continue
                candidates.append(self.absolute_url(href))

        return self.unique_urls(candidates)

    def _extract_last_page(self, soup) -> int:
        pages = [1]
        for link in soup.select("a[href*='?page=']"):
            href = link.get("href", "")
            match = re.search(r"[?&]page=(\d+)", href)
            if match:
                pages.append(int(match.group(1)))
        return max(pages)

    def _extract_doctor(
        self,
        doctor_url: str,
    ) -> tuple[DoctorRecord | None, ReviewSummaryRecord | None, ClinicRecord | None]:
        response = self.client.get_text(doctor_url, referer=self.absolute_url("/otzyvy-o-vrachah-belarusi?page=1"))
        soup = self.soup(response.text)

        full_name = self.normalize_space(soup.find("h1").get_text(" ", strip=True) if soup.find("h1") else "")
        if not full_name:
            return None, None, None

        rating_value = self._extract_rating_value(soup)
        review_count = self._extract_review_count(soup)
        specialty_name = self._extract_specialty_name(soup, response.text)
        clinic = self._extract_clinic(soup)

        clinic_external_ids = [clinic.external_id] if clinic else []
        clinic_links = [
            DoctorClinicLinkRecord(
                clinic_external_id=clinic.external_id,
                relation_source_url=response.url,
                booking_url=response.url,
                profile_url=response.url,
                aggregator_booking_url=response.url,
                aggregator_profile_url=response.url,
                source_type="aggregator",
                verification_status="aggregator_only",
                verified_on_clinic_site=False,
                confidence_score=0.45,
            )
        ] if clinic else []

        external_id = self._doctor_external_id(response.url)
        doctor = DoctorRecord(
            source=self.source_name,
            external_id=external_id,
            full_name=full_name,
            url=response.url,
            booking_url=response.url,
            profile_url=response.url,
            source_type="aggregator",
            verification_status="aggregator_only",
            verified_on_clinic_site=False,
            confidence_score=0.45,
            specialty_names=[specialty_name] if specialty_name else ["Не указано"],
            clinic_external_ids=clinic_external_ids,
            clinic_links=clinic_links,
            source_url=response.url,
        )
        review = ReviewSummaryRecord(
            source=self.source_name,
            subject_type="doctor",
            subject_external_id=external_id,
            rating_value=rating_value,
            review_count=review_count,
            url=response.url,
            source_url=response.url,
        )
        return doctor, review, clinic

    def _extract_rating_value(self, soup) -> float | None:
        node = soup.select_one(".average-rating")
        if not node:
            return None

        text = self.normalize_space(node.get_text(" ", strip=True)).replace(",", ".")
        match = re.search(r"(\d+(?:\.\d+)?)", text)
        if not match:
            return None

        rating = float(match.group(1))
        if rating <= 1:
            return None
        return rating if 0 <= rating <= 5 else None

    def _extract_review_count(self, soup) -> int:
        primary = soup.select_one(".bg-review")
        if primary:
            text = self.normalize_space(primary.get_text(" ", strip=True))
            match = re.search(r"(\d+)", text)
            if match:
                return int(match.group(1))

        fallback = soup.select_one(".total-votes")
        if not fallback:
            return 0

        text = self.normalize_space(fallback.get_text(" ", strip=True))
        match = re.search(r"(\d+)", text)
        return int(match.group(1)) if match else 0

    def _extract_specialty_name(self, soup, html: str) -> str | None:
        node = soup.select_one("[itemprop='medicalSpecialty']")
        if node:
            specialty = self.normalize_space(node.get_text(" ", strip=True))
            specialty = specialty.replace("Специальность:", "").strip()
            if specialty:
                return specialty

        title = soup.title.get_text(" ", strip=True) if soup.title else ""
        match = re.search(r"[★\d\s,.]*([А-ЯA-ZЁ][^,]+),", title)
        if match:
            specialty = self.normalize_space(match.group(1))
            if specialty and "Отзывы о враче" not in specialty:
                return specialty

        meta_description_match = re.search(r"[★\d\s,.]*([А-ЯA-ZЁ][^,]+),", html)
        if meta_description_match:
            specialty = self.normalize_space(meta_description_match.group(1))
            if specialty and "Отзывы о враче" not in specialty:
                return specialty

        return None

    def _extract_clinic(self, soup) -> ClinicRecord | None:
        clinic_link = None
        for link in soup.select("a[href]"):
            href = link.get("href", "")
            if "/medcentry/" in href:
                clinic_link = link
                break

        if not clinic_link or not clinic_link.get("href"):
            return None

        clinic_url = self.absolute_url(clinic_link["href"])
        raw_text = self.normalize_space(clinic_link.get_text(" ", strip=True))
        clinic_name, address = self._split_clinic_text(raw_text)
        external_slug = urlparse(clinic_url).path.rstrip("/").split("/")[-1]
        return ClinicRecord(
            source=self.source_name,
            external_id=f"doktora-clinic-{external_slug}",
            name=clinic_name,
            url=clinic_url,
            address=address,
            source_type="aggregator",
            is_official=False,
            source_priority=100,
            verification_status="aggregator_only",
            source_url=clinic_url,
        )

    def _split_clinic_text(self, text: str) -> tuple[str, str | None]:
        if " в Минске, " in text:
            clinic_name, address = text.split(" в Минске, ", 1)
            return clinic_name.strip(), address.strip()

        if ", Минск" in text:
            clinic_name, address = text.split(", Минск", 1)
            return clinic_name.strip(), f"Минск{address}".strip() or None

        return text, None

    def _doctor_external_id(self, url: str) -> str:
        return urlparse(url).path.rstrip("/").split("/")[-1]
