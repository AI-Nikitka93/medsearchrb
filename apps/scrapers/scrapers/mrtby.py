from __future__ import annotations

from datetime import date
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

STALE_PROMOTION_AGE_DAYS = 120


class MrtByScraper(BaseScraper):
    source_name = "mrtby"
    base_url = "https://mrt.by"
    allowed_seed_urls = (
        "https://mrt.by/",
        "https://mrt.by/akcii/",
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
            external_id="mrtby-main",
            name="Томография",
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
        promo_urls: list[str] = []
        for link in soup.select("a[href*='/akcii/']"):
            href = link.get("href", "")
            absolute = self.absolute_url(href)
            if absolute.rstrip("/") == self.absolute_url("/akcii").rstrip("/"):
                continue
            if "/akcii/" not in absolute:
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
            content = soup.select_one(".news-body") or soup.select_one(".article-body") or soup.select_one(".content")
            content_text = self.normalize_space(content.get_text(" ", strip=True) if content else soup.get_text(" ", strip=True))
            valid_until = self._find_deadline(content_text)
            published_on = self._find_published_on(soup, response.text)
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

    def _find_published_on(self, soup, html: str) -> str | None:
        for selector in (".green-text", ".news-date", ".article-date", ".date"):
            node = soup.select_one(selector)
            if not node:
                continue
            parsed = self._parse_russian_date(node.get_text(" ", strip=True))
            if parsed:
                return parsed

        match = re.search(r">\s*(\d{1,2}\s+[А-Яа-яЁё]+\s+\d{4})\s*<", html)
        if match:
            return self._parse_russian_date(match.group(1))
        return None

    def _is_stale_news_promotion(self, valid_until: str | None, published_on: str | None) -> bool:
        if valid_until or not published_on:
            return False

        published_date = self.parse_promotion_date(published_on)
        if not published_date:
            return False

        return (date.today() - published_date).days > STALE_PROMOTION_AGE_DAYS

    def _find_deadline(self, text: str) -> str | None:
        match = re.search(r"(\d{2}\.\d{2}\.\d{4})", text)
        if match:
            return self.parse_promotion_date(match.group(1)).isoformat() if self.parse_promotion_date(match.group(1)) else None
        return None

    def _parse_russian_date(self, value: str | None) -> str | None:
        normalized = self.normalize_space(value).lower()
        match = re.fullmatch(r"(\d{1,2})\s+([а-яё]+)\s+(\d{4})", normalized)
        if not match:
            return None

        month = RUS_MONTHS.get(match.group(2))
        if not month:
            return None

        return date(int(match.group(3)), month, int(match.group(1))).isoformat()
