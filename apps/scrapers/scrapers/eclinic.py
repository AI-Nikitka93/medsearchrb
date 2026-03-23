from __future__ import annotations

from datetime import date
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

STALE_PROMOTION_AGE_DAYS = 120


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
            published_on = self._find_published_on(soup)
            if self._is_stale_news_promotion(published_on):
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

    def _find_published_on(self, soup) -> str | None:
        node = soup.select_one(".date")
        if not node:
            return None
        return self._parse_russian_date(node.get_text(" ", strip=True))

    def _is_stale_news_promotion(self, published_on: str | None) -> bool:
        if not published_on:
            return False

        published_date = self.parse_promotion_date(published_on)
        if not published_date:
            return False

        return (date.today() - published_date).days > STALE_PROMOTION_AGE_DAYS

    def _parse_russian_date(self, value: str | None) -> str | None:
        normalized = self.normalize_space(value).lower()
        match = re.fullmatch(r"(\d{1,2})\s+([а-яё]+)\s+(\d{4})", normalized)
        if not match:
            return None

        month = RUS_MONTHS.get(match.group(2))
        if not month:
            return None

        return date(int(match.group(3)), month, int(match.group(1))).isoformat()
