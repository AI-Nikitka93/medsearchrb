from __future__ import annotations

import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


PROMO_KEYWORDS = (
    "акци",
    "скид",
    "подар",
    "выгод",
    "комплекс",
    "сертифик",
)


class EClinicScraper(BaseScraper):
    source_name = "eclinic"
    base_url = "https://e-clinic.by"
    allowed_seed_urls = (
        "https://e-clinic.by/",
        "https://e-clinic.by/news/",
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
            external_id="eclinic-main",
            name="E-clinic",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/news/"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address="Минск",
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        archive_urls = [
            self.absolute_url("/news/"),
            self.absolute_url("/news/?PAGEN_1=2"),
        ]
        promo_candidates: list[tuple[str, str]] = []

        for archive_url in archive_urls:
            response = self.client.get_text(archive_url, referer=self.absolute_url("/news/"))
            soup = self.soup(response.text)
            for link in soup.select("a[href*='/news/']"):
                href = link.get("href", "")
                absolute = self.absolute_url(href)
                title = self.normalize_space(link.get_text(" ", strip=True))
                if absolute.rstrip("/") in {
                    self.absolute_url("/news").rstrip("/"),
                    self.absolute_url("/news/?PAGEN_1=2").rstrip("/"),
                }:
                    continue
                if len(title) < 8:
                    continue
                if any(keyword in title.lower() for keyword in PROMO_KEYWORDS):
                    promo_candidates.append((absolute, title))

        promotions: list[PromotionRecord] = []
        for promo_url, fallback_title in self._unique_candidates(promo_candidates):
            self.polite_sleep()
            response = self.client.get_text(promo_url, referer=self.absolute_url("/news/"))
            soup = self.soup(response.text)
            heading = soup.find("h1")
            title = self.normalize_space(heading.get_text(" ", strip=True) if heading else fallback_title)
            content = soup.select_one(".detail-text-wrap") or soup.select_one(".detail")
            content_text = self.normalize_space(content.get_text(" ", strip=True) if content else soup.get_text(" ", strip=True))
            if not any(keyword in content_text.lower() for keyword in PROMO_KEYWORDS):
                continue
            if not self.promotion_is_active(title, content_text, None):
                continue
            promotions.append(
                PromotionRecord(
                    source=self.source_name,
                    external_id=promo_url.rstrip("/").split("/")[-1],
                    title=title,
                    url=promo_url,
                    clinic_external_id=clinic_external_id,
                    source_url=response.url,
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
