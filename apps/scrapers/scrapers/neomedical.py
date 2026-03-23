from __future__ import annotations

from datetime import date
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


STALE_PROMOTION_AGE_DAYS = 120

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


class NeoMedicalScraper(BaseScraper):
    source_name = "neomedical"
    base_url = "https://neomedical.by"
    allowed_seed_urls = (
        "https://neomedical.by/",
        "https://neomedical.by/akcii/",
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
            external_id="neomedical-main",
            name="Неомедикал",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/akcii/"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address="Минск, ул. Романовская Слобода, 26",
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        archive_urls = [
            self.absolute_url("/akcii/"),
            self.absolute_url("/akcii/?PAGEN_1=2"),
        ]
        promo_urls: list[str] = []
        for archive_url in archive_urls:
            response = self.client.get_text(archive_url, referer=self.absolute_url("/akcii/"))
            soup = self.soup(response.text)
            for link in soup.select("a[href*='/akcii/']"):
                href = link.get("href", "")
                absolute = self.absolute_url(href)
                if absolute.rstrip("/") in {
                    self.absolute_url("/akcii").rstrip("/"),
                    self.absolute_url("/akcii/?PAGEN_1=2").rstrip("/"),
                }:
                    continue
                if "/akcii/" not in absolute or "PAGEN_1=" in absolute:
                    continue
                promo_urls.append(absolute)

        promotions: list[PromotionRecord] = []
        for promo_url in self.unique_urls(promo_urls):
            self.polite_sleep()
            response = self.client.get_text(promo_url, referer=self.absolute_url("/akcii/"))
            soup = self.soup(response.text)
            heading = soup.find("h1")
            title = self.normalize_space(heading.get_text(" ", strip=True) if heading else "")
            if not title:
                continue

            content_text = self.normalize_space(soup.get_text(" ", strip=True))
            valid_until = self._find_deadline(content_text)
            published_on = self._find_published_on(content_text)
            if self._is_stale_news_promotion(valid_until, published_on):
                continue
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
                    source_url=response.url,
                )
            )

        return promotions

    def _find_deadline(self, text: str) -> str | None:
        normalized = self.normalize_space(text).lower()
        match = re.search(
            r"действует\s+с\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})\s+года\s+по\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})\s+года",
            normalized,
        )
        if match:
            month = RUS_MONTHS.get(match.group(5))
            if month:
                return date(int(match.group(6)), month, int(match.group(4))).isoformat()

        match = re.search(r"до\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})", normalized)
        if not match:
            return None

        month = RUS_MONTHS.get(match.group(2))
        if not month:
            return None

        return date(int(match.group(3)), month, int(match.group(1))).isoformat()

    def _find_published_on(self, text: str) -> str | None:
        normalized = self.normalize_space(text).lower()
        match = re.search(r"(\d{1,2})\s+([а-яё]+)\s+(\d{4})", normalized)
        if not match:
            return None

        month = RUS_MONTHS.get(match.group(2))
        if not month:
            return None

        return date(int(match.group(3)), month, int(match.group(1))).isoformat()

    def _is_stale_news_promotion(self, valid_until: str | None, published_on: str | None) -> bool:
        if valid_until or not published_on:
            return False

        published_date = self.parse_promotion_date(published_on)
        if not published_date:
            return False

        return (date.today() - published_date).days > STALE_PROMOTION_AGE_DAYS
