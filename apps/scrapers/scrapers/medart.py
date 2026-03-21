from __future__ import annotations

import json
import re

from bs4 import Tag

from apps.scrapers.models import ClinicRecord, DoctorClinicLinkRecord, DoctorRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


class MedArtScraper(BaseScraper):
    source_name = "medart"
    base_url = "https://medart.by"
    allowed_seed_urls = (
        "https://medart.by/",
        "https://medart.by/spetsialisty/",
        "https://medart.by/stocks/",
    )

    def collect(self):
        batch = self.empty_batch()

        clinic = self._extract_clinic()
        if clinic:
            batch.clinics.append(clinic)

        doctor_urls = self._extract_doctor_urls()
        for doctor_url in self.trim_doctor_urls(doctor_urls):
            self.client.sleep_with_jitter()
            doctor = self._extract_doctor(doctor_url, clinic.external_id if clinic else None)
            if doctor:
                batch.doctors.append(doctor)

        promotions = self._extract_promotions(clinic.external_id if clinic else None)
        batch.promotions.extend(promotions)
        return batch

    def _extract_clinic(self) -> ClinicRecord | None:
        response = self.client.get_text(self.base_url, referer=self.base_url)
        soup = self.soup(response.text)

        for script in soup.select("script[type='application/ld+json']"):
            try:
                payload = json.loads(script.get_text(strip=True))
            except json.JSONDecodeError:
                continue
            if isinstance(payload, dict) and payload.get("@type") == "MedicalOrganization":
                address = payload.get("address", {})
                address_text = ", ".join(
                    filter(
                        None,
                        [
                            address.get("streetAddress"),
                            address.get("addressLocality"),
                        ],
                    )
                )
                return ClinicRecord(
                    source=self.source_name,
                    external_id="medart-main",
                    name=payload.get("name", "МедАрт"),
                    url=self.base_url,
                    site_url=self.base_url,
                    official_directory_url=self.absolute_url("/spetsialisty/"),
                    source_type="official_directory",
                    is_official=True,
                    source_priority=10,
                    verification_status="official_source",
                    address=address_text or None,
                    source_url=response.url,
                )

        title = soup.title.get_text(strip=True) if soup.title else "МедАрт"
        return ClinicRecord(
            source=self.source_name,
            external_id="medart-main",
            name=title.split("|")[0].strip(),
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/spetsialisty/"),
            source_type="official_directory",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            source_url=response.url,
        )

    def _extract_doctor_urls(self) -> list[str]:
        response = self.client.get_text(self.absolute_url("/spetsialisty/"), referer=self.base_url)
        soup = self.soup(response.text)
        candidates: list[str] = []
        for link in soup.select("a[href*='/spetsialisty/']"):
            href = link.get("href", "")
            if re.search(r"/spetsialisty/[^/]+/[^/]+/?$", href):
                candidates.append(href)
        return self.unique_urls(candidates)

    def _extract_doctor(self, url: str, clinic_external_id: str | None) -> DoctorRecord | None:
        response = self.client.get_text(url, referer=self.absolute_url("/spetsialisty/"))
        soup = self.soup(response.text)

        full_name = ""
        specialty_names: list[str] = []

        headline = soup.find(["h1", "h2"])
        if headline:
            full_name = self.normalize_space(headline.get_text())

        breadcrumbs = [self.normalize_space(item.get_text()) for item in soup.select(".breadcrumbs a, .breadcrumb a")]
        specialty_names = [value for value in breadcrumbs if value and value not in {"Главная", "Специалисты"}]

        if not specialty_names:
            meta_description = soup.find("meta", attrs={"name": "description"})
            if meta_description and meta_description.get("content"):
                description = meta_description["content"]
                specialty_match = re.search(r"(врач|специалист)\s+([^,.]+)", description, re.IGNORECASE)
                if specialty_match:
                    specialty_names = [self.normalize_space(specialty_match.group(2))]

        if not full_name:
            return None

        external_id = url.rstrip("/").split("/")[-1]
        return DoctorRecord(
            source=self.source_name,
            external_id=external_id,
            full_name=full_name,
            url=url,
            booking_url=url,
            profile_url=url,
            official_profile_url=url,
            source_type="official_directory",
            verification_status="official_verified",
            verified_on_clinic_site=True,
            confidence_score=0.98,
            specialty_names=specialty_names or ["Не указано"],
            clinic_external_ids=[clinic_external_id] if clinic_external_id else [],
            clinic_links=[
                DoctorClinicLinkRecord(
                    clinic_external_id=clinic_external_id,
                    relation_source_url=url,
                    booking_url=url,
                    profile_url=url,
                    official_profile_url=url,
                    source_type="official_directory",
                    verification_status="official_verified",
                    verified_on_clinic_site=True,
                    confidence_score=0.98,
                )
            ] if clinic_external_id else [],
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        response = self.client.get_text(self.absolute_url("/stocks/"), referer=self.base_url)
        soup = self.soup(response.text)
        promo_links: dict[str, str] = {}

        for link in soup.select("a[href*='/stocks/']"):
            href = link.get("href", "")
            if href.rstrip("/") == "/stocks":
                continue
            title = self.normalize_space(link.get_text())
            if len(title) < 6:
                continue
            promo_links[self.absolute_url(href)] = title

        promotions: list[PromotionRecord] = []
        for promo_url, title in list(promo_links.items())[:10]:
            self.client.sleep_with_jitter()
            promo_response = self.client.get_text(promo_url, referer=self.absolute_url("/stocks/"))
            promo_soup = self.soup(promo_response.text)
            heading = promo_soup.find(["h1", "h2"])
            normalized_title = self.normalize_space(heading.get_text()) if heading else title
            promotions.append(
                PromotionRecord(
                    source=self.source_name,
                    external_id=promo_url.rstrip("/").split("/")[-1],
                    title=normalized_title,
                    url=promo_url,
                    clinic_external_id=clinic_external_id,
                    valid_until=self._find_deadline(promo_soup),
                    source_url=promo_response.url,
                )
            )
        return promotions

    def _find_deadline(self, soup: Tag) -> str | None:
        text = self.normalize_space(soup.get_text(" ", strip=True))
        match = re.search(r"(\d{2}\.\d{2}\.\d{4})", text)
        if match:
            return match.group(1)
        return None
