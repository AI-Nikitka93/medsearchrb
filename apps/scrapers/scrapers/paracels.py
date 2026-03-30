from __future__ import annotations

from datetime import datetime
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


class ParacelsScraper(BaseScraper):
    source_name = "paracels"
    base_url = "https://www.narkolog.by"
    allowed_seed_urls = (
        "https://www.narkolog.by/",
        "https://www.narkolog.by/sales/",
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
        address_match = re.search(
            r"ул\.\s*Маяковского,\s*129А/1",
            response.text,
            re.IGNORECASE,
        )
        address = "Минск, ул. Маяковского, 129А/1" if address_match else "Минск"
        return ClinicRecord(
            source=self.source_name,
            external_id="paracels-main",
            name="Парацельс",
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
        for promo_url, fallback_title in self._unique_candidates(promo_candidates):
            self.polite_sleep()
            promo_response = self.client.get_text(promo_url, referer=self.absolute_url("/sales/"))
            promo_soup = self.soup(promo_response.text)
            heading = promo_soup.find("h1")
            title = self.normalize_space(heading.get_text(" ", strip=True) if heading else fallback_title)
            content = (
                promo_soup.select_one(".content")
                or promo_soup.select_one(".detail-text-wrap")
                or promo_soup.select_one(".page-content")
            )
            content_text = self.normalize_space(
                content.get_text(" ", strip=True) if content else promo_soup.get_text(" ", strip=True),
            )
            valid_until = self._find_deadline(content_text)
            if not self.promotion_is_active(title, content_text, valid_until):
                continue
            promotions.append(
                PromotionRecord(
                    source=self.source_name,
                    external_id=promo_url.rstrip("/").split("/")[-1],
                    title=title,
                    url=promo_url,
                    clinic_external_id=clinic_external_id,
                    valid_until=valid_until,
                    source_url=promo_response.url,
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

    def _find_deadline(self, text: str) -> str | None:
        match = re.search(r"(\d{2}\.\d{2}\.\d{4})", text)
        if match:
            return datetime.strptime(match.group(1), "%d.%m.%Y").date().isoformat()
        return None
