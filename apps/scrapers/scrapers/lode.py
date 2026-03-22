from __future__ import annotations

from datetime import datetime
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


PROMO_KEYWORDS = (
    "акци",
    "скид",
    "выгод",
    "подар",
    "предлож",
    "специальн",
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


class LodeScraper(BaseScraper):
    source_name = "lode"
    base_url = "https://www.lode.by"
    allowed_seed_urls = (
        "https://www.lode.by/",
        "https://www.lode.by/news/",
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
            external_id="lode-main",
            name="ЛОДЭ",
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
        archive_response = self.client.get_text(self.absolute_url("/news/"), referer=self.base_url)
        archive_soup = self.soup(archive_response.text)
        promo_candidates: list[tuple[str, str]] = []

        for link in archive_soup.select("a[href*='/news/']"):
            href = link.get("href", "")
            absolute = self.absolute_url(href)
            if absolute.rstrip("/") == self.absolute_url("/news").rstrip("/"):
                continue
            title = self.normalize_space(link.get_text(" ", strip=True))
            if len(title) < 8:
                continue
            if any(keyword in title.lower() for keyword in PROMO_KEYWORDS):
                promo_candidates.append((absolute, title))

        promotions: list[PromotionRecord] = []
        for promo_url, fallback_title in self._unique_candidates(promo_candidates):
            self.client.sleep_with_jitter()
            promo_response = self.client.get_text(promo_url, referer=self.absolute_url("/news/"))
            promo_soup = self.soup(promo_response.text)
            heading = promo_soup.find("h1")
            title = self.normalize_space(heading.get_text(" ", strip=True) if heading else fallback_title)
            content = promo_soup.select_one(".news-detail") or promo_soup.select_one(".entry-content")
            content_text = self.normalize_space(content.get_text(" ", strip=True) if content else promo_soup.get_text(" ", strip=True))
            if not any(keyword in content_text.lower() for keyword in PROMO_KEYWORDS):
                continue

            promotions.append(
                PromotionRecord(
                    source=self.source_name,
                    external_id=promo_url.rstrip("/").split("/")[-1],
                    title=title,
                    url=promo_url,
                    clinic_external_id=clinic_external_id,
                    valid_until=self._find_deadline(content_text),
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
        match = re.search(r"до\s+(\d{1,2}\s+[А-Яа-яA-Za-z]+\s+\d{4}|\d{2}\.\d{2}\.\d{4})", text, re.IGNORECASE)
        if match:
            parsed = self._to_iso(match.group(1))
            if parsed:
                return parsed
        match = re.search(r"(\d{2}\.\d{2}\.\d{4})", text)
        if match:
            parsed = self._to_iso(match.group(1))
            if parsed:
                return parsed
        return None

    def _to_iso(self, value: str) -> str | None:
        normalized = self.normalize_space(value).lower()
        if re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", normalized):
            return datetime.strptime(normalized, "%d.%m.%Y").date().isoformat()

        match = re.fullmatch(r"(\d{1,2})\s+([а-яё]+)\s+(\d{4})", normalized)
        if not match:
            return None

        day = int(match.group(1))
        month = RUS_MONTHS.get(match.group(2))
        year = int(match.group(3))
        if not month:
            return None
        return datetime(year, month, day).date().isoformat()
