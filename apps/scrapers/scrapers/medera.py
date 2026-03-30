from __future__ import annotations

import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


class MederaScraper(BaseScraper):
    source_name = "medera"
    base_url = "https://medera.by"
    allowed_seed_urls = (
        "https://medera.by/",
        "https://medera.by/promotions/",
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
        return ClinicRecord(
            source=self.source_name,
            external_id="medera-main",
            name="Эра",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/promotions/"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address="Минск, ул. Пионерская, 32",
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        response = self.client.get_text(self.absolute_url("/promotions/"), referer=self.base_url)
        soup = self.soup(response.text)
        promotions: list[PromotionRecord] = []

        for card in soup.select(".elementor-image-box-wrapper"):
            title_node = card.select_one(".elementor-image-box-title")
            description_node = card.select_one(".elementor-image-box-description")

            title = self.normalize_space(title_node.get_text(" ", strip=True) if title_node else "")
            description = self.normalize_space(description_node.get_text(" ", strip=True) if description_node else "")
            if len(title) < 6:
                continue

            external_id = self._slugify(title)
            if any(promo.external_id == external_id for promo in promotions):
                continue
            if not self.promotion_is_active(title, description, None):
                continue

            promotions.append(
                PromotionRecord(
                    source=self.source_name,
                    external_id=external_id,
                    title=title,
                    url=self.absolute_url("/promotions/"),
                    clinic_external_id=clinic_external_id,
                    source_url=response.url,
                )
            )

        return promotions

    def _slugify(self, value: str) -> str:
        slug = re.sub(r"[^a-z0-9а-яё]+", "-", value.lower(), flags=re.IGNORECASE).strip("-")
        return slug or "promotion"
