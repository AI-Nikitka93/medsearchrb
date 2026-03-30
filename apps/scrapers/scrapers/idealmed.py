from __future__ import annotations

from datetime import datetime
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


class IdealMedScraper(BaseScraper):
    source_name = "idealmed"
    base_url = "https://idealmed.by"
    allowed_seed_urls = (
        "https://idealmed.by/",
        "https://idealmed.by/akczii-i-skidki.html",
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
            external_id="idealmed-main",
            name="ИдеалМед",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/akczii-i-skidki.html"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address="Минск, ул. К. Цеткин, 16",
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        response = self.client.get_text(self.absolute_url("/akczii-i-skidki.html"), referer=self.base_url)
        soup = self.soup(response.text)

        promo_urls: list[str] = []
        for link in soup.select("a[href*='/akczii-i-skidki/']"):
            href = link.get("href", "")
            absolute = self.absolute_url(href)
            if absolute.rstrip("/") == self.absolute_url("/akczii-i-skidki.html").rstrip("/"):
                continue
            if "/akczii-i-skidki/" not in absolute:
                continue
            promo_urls.append(absolute)

        promotions: list[PromotionRecord] = []
        for promo_url in self.unique_urls(promo_urls):
            self.polite_sleep()
            promo_response = self.client.get_text(promo_url, referer=self.absolute_url("/akczii-i-skidki.html"))
            promo_soup = self.soup(promo_response.text)
            title = self._extract_title(promo_soup)
            if not title:
                continue

            content = (
                promo_soup.select_one(".item-page")
                or promo_soup.select_one(".content")
                or promo_soup.select_one(".page-content")
                or promo_soup.select_one(".entry-content")
            )
            content_text = self.normalize_space(
                content.get_text(" ", strip=True) if content else promo_soup.get_text(" ", strip=True),
            )
            valid_until = self._find_deadline(f"{title} {content_text}")
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

    def _extract_title(self, soup) -> str:
        heading = soup.find("h1")
        if heading:
            return self.normalize_space(heading.get_text(" ", strip=True))

        title_node = soup.find("title")
        raw_title = self.normalize_space(title_node.get_text(" ", strip=True) if title_node else "")
        return raw_title.split(" - IdealMed")[0].strip()

    def _find_deadline(self, text: str) -> str | None:
        patterns = (
            r"(?:до|по)\s+(\d{2}\.\d{2}\.\d{4})",
            r"(?:действует|акция)\s+до\s+(\d{2}\.\d{2}\.\d{4})",
        )
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return datetime.strptime(match.group(1), "%d.%m.%Y").date().isoformat()
        return None
