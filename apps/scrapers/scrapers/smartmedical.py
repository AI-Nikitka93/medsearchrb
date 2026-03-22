from __future__ import annotations

from datetime import datetime
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


PROMO_KEYWORDS = (
    "акци",
    "скид",
    "подар",
    "сертифик",
    "выгод",
    "комплекс",
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


class SmartMedicalScraper(BaseScraper):
    source_name = "smartmedical"
    base_url = "https://smartmedical.by"
    allowed_seed_urls = (
        "https://smartmedical.by/",
        "https://smartmedical.by/news/",
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
            r"ул\.\s*([А-Яа-яA-Za-zЁё.\-\s]+,\s*\d+[А-Яа-яA-Za-z\-\/]*)",
            response.text,
            re.IGNORECASE,
        )
        address = self.normalize_space(f"Минск, ул. {address_match.group(1)}") if address_match else "Минск"
        return ClinicRecord(
            source=self.source_name,
            external_id="smartmedical-main",
            name="SMART MEDICAL",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/news/"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address=address,
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
                if len(title) < 8:
                    continue
                if absolute.rstrip("/") in {self.absolute_url("/news").rstrip("/"), self.absolute_url("/news/?PAGEN_1=2").rstrip("/")}:
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
            content = soup.select_one(".content") or soup.select_one(".entry-content") or soup.select_one(".page-content")
            content_text = self.normalize_space(content.get_text(" ", strip=True) if content else soup.get_text(" ", strip=True))
            if not any(keyword in content_text.lower() for keyword in PROMO_KEYWORDS):
                continue
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

    def _find_deadline(self, text: str) -> str | None:
        match = re.search(r"с\s+(\d{1,2}\s+[А-Яа-яA-Za-z]+\s+\d{4})\s+по\s+(\d{1,2}\s+[А-Яа-яA-Za-z]+\s+\d{4})", text, re.IGNORECASE)
        if match:
            return self._to_iso(match.group(2))
        match = re.search(r"(\d{2}\.\d{2}\.\d{4})", text)
        if match:
            return datetime.strptime(match.group(1), "%d.%m.%Y").date().isoformat()
        return None

    def _to_iso(self, value: str) -> str | None:
        normalized = self.normalize_space(value).lower()
        match = re.fullmatch(r"(\d{1,2})\s+([а-яё]+)\s+(\d{4})", normalized)
        if not match:
            return None
        month = RUS_MONTHS.get(match.group(2))
        if not month:
            return None
        return datetime(int(match.group(3)), month, int(match.group(1))).date().isoformat()
