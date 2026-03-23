from __future__ import annotations

from datetime import datetime
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


PROMO_KEYWORDS = (
    "акци",
    "скид",
    "чек-ап",
    "комплекс",
    "выгод",
    "подар",
    "промокод",
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


class DoctorTutScraper(BaseScraper):
    source_name = "doctortut"
    base_url = "https://doctortut.by"
    allowed_seed_urls = (
        "https://doctortut.by/",
        "https://doctortut.by/sale/",
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
            external_id="doctortut-main",
            name="Доктор Тут",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/sale/"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address="Минск, ул. Колесникова, 15",
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        response = self.client.get_text(self.absolute_url("/sale/"), referer=self.base_url)
        soup = self.soup(response.text)
        promo_candidates: list[tuple[str, str]] = []

        for link in soup.select("a[href*='/sale/']"):
            href = link.get("href", "")
            absolute = self.absolute_url(href)
            if absolute.rstrip("/") == self.absolute_url("/sale").rstrip("/"):
                continue
            title = self.normalize_space(link.get_text(" ", strip=True))
            if len(title) < 8:
                continue
            if any(keyword in title.lower() for keyword in PROMO_KEYWORDS):
                promo_candidates.append((absolute, title))

        promotions: list[PromotionRecord] = []
        for promo_url, fallback_title in self._unique_candidates(promo_candidates):
            self.polite_sleep()
            detail = self.client.get_text(promo_url, referer=self.absolute_url("/sale/"))
            soup = self.soup(detail.text)
            title_node = soup.find("h1")
            title = self.normalize_space(title_node.get_text(" ", strip=True) if title_node else fallback_title)
            content_text = self.normalize_space(soup.get_text(" ", strip=True))
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
                    source_url=detail.url,
                )
            )

        return promotions

    def _find_deadline(self, text: str) -> str | None:
        match = re.search(r"до\s+(\d{2}\.\d{2}\.\d{4})", text, re.IGNORECASE)
        if match:
            return datetime.strptime(match.group(1), "%d.%m.%Y").date().isoformat()

        match = re.search(r"до\s+(\d{1,2}\s+[А-Яа-яЁё]+\s+\d{4})", text, re.IGNORECASE)
        if match:
            normalized = self.normalize_space(match.group(1)).lower()
            parsed = re.fullmatch(r"(\d{1,2})\s+([а-яё]+)\s+(\d{4})", normalized)
            if parsed:
                month = RUS_MONTHS.get(parsed.group(2))
                if month:
                    return datetime(int(parsed.group(3)), month, int(parsed.group(1))).date().isoformat()

        return None

    def _unique_candidates(self, candidates: list[tuple[str, str]]) -> list[tuple[str, str]]:
        seen: set[str] = set()
        unique: list[tuple[str, str]] = []
        for url, title in candidates:
            if url in seen:
                continue
            seen.add(url)
            unique.append((url, title))
        return unique
