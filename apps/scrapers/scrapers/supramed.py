from __future__ import annotations

import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


class SupraMedScraper(BaseScraper):
    source_name = "supramed"
    base_url = "https://supramed.by"
    allowed_seed_urls = (
        "https://supramed.by/",
        "https://supramed.by/sales/",
    )

    def collect(self):
        batch = self.empty_batch()
        clinic = self._extract_clinic()
        if clinic:
            batch.clinics.append(clinic)
        batch.promotions.extend(self._extract_promotions(clinic.external_id if clinic else None))
        return batch

    def _extract_clinic(self) -> ClinicRecord:
        response = self.client.get_text(self.base_url, referer=self.base_url)
        address_match = re.search(r"Жукова,\s*44", response.text, re.IGNORECASE)
        address = "Минск, просп. Жукова, 44" if address_match else "Минск"
        return ClinicRecord(
            source=self.source_name,
            external_id="supramed-main",
            name="Супрамед",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/sales/"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address=address,
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        response = self.client.get_text(self.absolute_url("/sales/"), referer=self.base_url)
        soup = self.soup(response.text)
        promo_candidates: list[tuple[str, str]] = []
        for link in soup.select("a[href*='/sales/']"):
            href = link.get("href", "")
            absolute = self.absolute_url(href)
            if absolute.rstrip("/") == self.absolute_url("/sales").rstrip("/"):
                continue
            title = self.normalize_space(link.get_text(" ", strip=True))
            if len(title) < 8:
                continue
            promo_candidates.append((absolute, title))

        promotions: list[PromotionRecord] = []
        for promo_url, title in self._unique_candidates(promo_candidates):
            promotions.append(
                PromotionRecord(
                    source=self.source_name,
                    external_id=promo_url.rstrip("/").split("/")[-1],
                    title=title,
                    url=promo_url,
                    clinic_external_id=clinic_external_id,
                    source_url=promo_url,
                )
            )
        return promotions

    def _unique_candidates(self, candidates: list[tuple[str, str]]) -> list[tuple[str, str]]:
        seen: set[str] = set()
        unique: list[tuple[str, str]] = []
        for url, title in candidates:
            if url in seen:
                continue
            seen.add(url)
            unique.append((url, title))
        return unique
