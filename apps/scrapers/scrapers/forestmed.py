from __future__ import annotations

from datetime import date
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


PROMO_KEYWORDS = (
    "акци",
    "скид",
    "чек-ап",
    "комплекс",
    "подар",
    "выгод",
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


class ForestMedScraper(BaseScraper):
    source_name = "forestmed"
    base_url = "https://forestmed.by"
    allowed_seed_urls = (
        "https://forestmed.by/",
        "https://forestmed.by/akcii/",
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
            external_id="forestmed-main",
            name="Форестмед",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/akcii/"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address="Минск",
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        response = self.client.get_text(self.absolute_url("/akcii/"), referer=self.base_url)
        soup = self.soup(response.text)
        promo_candidates: list[tuple[str, str]] = []

        for link in soup.select("a[href]"):
            href = link.get("href", "")
            absolute = self.absolute_url(href)
            title = self.normalize_space(link.get_text(" ", strip=True))
            if "/20" not in absolute:
                continue
            if len(title) < 8:
                continue
            if any(keyword in title.lower() for keyword in PROMO_KEYWORDS):
                promo_candidates.append((absolute, title))

        promotions: list[PromotionRecord] = []
        for promo_url, fallback_title in self._unique_candidates(promo_candidates):
            self.polite_sleep()
            detail = self.client.get_text(promo_url, referer=self.absolute_url("/akcii/"))
            soup = self.soup(detail.text)
            article = soup.select_one("article")
            title_node = soup.find("h1")
            title = self.normalize_space(title_node.get_text(" ", strip=True) if title_node else fallback_title)
            content_text = self.normalize_space(article.get_text(" ", strip=True) if article else soup.get_text(" ", strip=True))
            published_on = self._extract_published_on_from_url(promo_url)
            valid_until = self._find_deadline(f"{title} {content_text}", published_on)
            if self._is_stale_without_deadline(valid_until, published_on):
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
                    source_url=detail.url,
                )
            )

        return promotions

    def _find_deadline(self, text: str, published_on: str | None) -> str | None:
        match = re.search(r"до\s+(\d{1,2}\s+[А-Яа-яЁё]+(?:\s+\d{4})?)", text, re.IGNORECASE)
        if match:
            parsed = self._parse_russian_date(match.group(1), published_on)
            if parsed:
                return parsed

        match = re.search(r"(\d{2}\.\d{2}\.\d{4})", text)
        if match:
            parsed = self.parse_promotion_date(match.group(1))
            if parsed:
                return parsed.isoformat()

        return None

    def _extract_published_on_from_url(self, url: str) -> str | None:
        match = re.search(r"/(20\d{2})/(\d{2})/(\d{2})/", url)
        if not match:
            return None
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3))).isoformat()

    def _parse_russian_date(self, value: str, published_on: str | None) -> str | None:
        normalized = self.normalize_space(value).lower()
        match = re.fullmatch(r"(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?", normalized)
        if not match:
            return None

        month = RUS_MONTHS.get(match.group(2))
        if not month:
            return None

        year = int(match.group(3)) if match.group(3) else None
        if year is None:
            published_date = self.parse_promotion_date(published_on)
            year = published_date.year if published_date else date.today().year

        return date(year, month, int(match.group(1))).isoformat()

    def _is_stale_without_deadline(self, valid_until: str | None, published_on: str | None) -> bool:
        if valid_until or not published_on:
            return False

        published_date = self.parse_promotion_date(published_on)
        if not published_date:
            return False

        return (date.today() - published_date).days > STALE_PROMOTION_AGE_DAYS

    def _unique_candidates(self, candidates: list[tuple[str, str]]) -> list[tuple[str, str]]:
        seen: set[str] = set()
        unique: list[tuple[str, str]] = []
        for url, title in candidates:
            if url in seen:
                continue
            seen.add(url)
            unique.append((url, title))
        return unique
