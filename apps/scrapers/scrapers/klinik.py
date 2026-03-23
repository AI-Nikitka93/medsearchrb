from __future__ import annotations

from datetime import date
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


class KlinikScraper(BaseScraper):
    source_name = "klinik"
    base_url = "https://klinik.by"
    allowed_seed_urls = (
        "https://klinik.by/",
        "https://klinik.by/about-slinis/sales-2/",
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
            external_id="klinik-main",
            name="Клиника в Уручье",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/about-slinis/sales-2/"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address="Минск",
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        response = self.client.get_text(self.absolute_url("/about-slinis/sales-2/"), referer=self.base_url)
        soup = self.soup(response.text)
        promotions: list[PromotionRecord] = []
        seen: set[tuple[str, str | None]] = set()

        for card in soup.select(".card-sales"):
            text = self.normalize_space(card.get_text(" ", strip=True))
            if len(text) < 40:
                continue

            title = text.split(" Акции ", 1)[0].strip()
            if not title:
                continue

            valid_until = self._find_deadline(text)
            if not self.promotion_is_active(title, text, valid_until):
                continue

            key = (title, valid_until)
            if key in seen:
                continue
            seen.add(key)

            promotions.append(
                PromotionRecord(
                    source=self.source_name,
                    external_id=self._slugify(f"{title}-{valid_until or 'open'}"),
                    title=title,
                    url=self.absolute_url("/about-slinis/sales-2/"),
                    clinic_external_id=clinic_external_id,
                    valid_until=valid_until,
                    source_url=response.url,
                )
            )

        return promotions

    def _find_deadline(self, text: str) -> str | None:
        match = re.search(r"С\s+(\d{2}\.\d{2}\.\d{4})\s+по\s+(\d{2}\.\d{2}\.\d{4})", text, re.IGNORECASE)
        if match:
            parsed = self.parse_promotion_date(match.group(2))
            return parsed.isoformat() if parsed else None

        match = re.search(r"До\s+(\d{2}\.\d{2})", text, re.IGNORECASE)
        if not match:
            return None

        parsed = self.parse_promotion_date(f"{match.group(1)}.{date.today().year}")
        if parsed and parsed < date.today():
            parsed = self.parse_promotion_date(f"{match.group(1)}.{date.today().year + 1}")
        return parsed.isoformat() if parsed else None

    def _slugify(self, value: str) -> str:
        slug = re.sub(r"[^a-z0-9а-яё]+", "-", value.lower())
        return slug.strip("-")
