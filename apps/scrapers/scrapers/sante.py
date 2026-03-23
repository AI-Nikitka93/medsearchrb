from __future__ import annotations

from datetime import date
import json
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


RUS_MONTHS = {
    "января": 1,
    "февраля": 2,
    "марта": 3,
    "апреля": 4,
    "мая": 5,
    "июня": 6,
    "июля": 7,
    "августа": 8,
    "сентября": 9,
    "октября": 10,
    "ноября": 11,
    "декабря": 12,
}


class SanteScraper(BaseScraper):
    source_name = "sante"
    base_url = "https://sante.by"
    allowed_seed_urls = (
        "https://sante.by/",
        "https://sante.by/promotions",
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
            external_id="sante-main",
            name="Санте",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/promotions"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address="Минск",
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        response = self.client.get_text(self.absolute_url("/promotions"), referer=self.base_url)
        next_data = self._extract_next_data(response.text)
        current_promotions = next_data.get("currentPromotions", [])

        promotions: list[PromotionRecord] = []
        for item in current_promotions:
            title = self.normalize_space(str(item.get("title", "")))
            slug = self.normalize_space(str(item.get("slug", "")))
            if not title or not slug:
                continue
            valid_until = self._find_deadline(str(item.get("date", "")))
            if not self.promotion_is_active(title, str(item.get("date", "")), valid_until):
                continue
            promo_url = self.absolute_url(f"/promotions/{slug}")
            promotions.append(
                PromotionRecord(
                    source=self.source_name,
                    external_id=slug,
                    title=title,
                    url=promo_url,
                    clinic_external_id=clinic_external_id,
                    valid_until=valid_until,
                    source_url=promo_url,
                )
            )

        return promotions

    def _extract_next_data(self, html: str) -> dict:
        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
        if not match:
            return {}

        try:
            payload = json.loads(match.group(1))
        except json.JSONDecodeError:
            return {}

        return payload.get("props", {}).get("pageProps", {})

    def _find_deadline(self, text: str) -> str | None:
        match = re.search(
            r"по\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})",
            self.normalize_space(text).lower(),
            re.IGNORECASE,
        )
        if not match:
            return None

        month = RUS_MONTHS.get(match.group(2))
        if not month:
            return None

        return date(int(match.group(3)), month, int(match.group(1))).isoformat()
