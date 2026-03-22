from __future__ import annotations

from datetime import datetime
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


class MedAvenuScraper(BaseScraper):
    source_name = "medavenu"
    base_url = "https://medavenu.by"
    allowed_seed_urls = (
        "https://medavenu.by/",
        "https://medavenu.by/akcii/",
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
            external_id="medavenu-main",
            name="МедАвеню",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/akcii/"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address=address,
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
            promo_response = self.client.get_text(promo_url, referer=self.absolute_url("/akcii/"))
            promo_soup = self.soup(promo_response.text)
            heading = promo_soup.find("h1")
            title = self.normalize_space(heading.get_text(" ", strip=True) if heading else "")
            if not title:
                continue
            content = promo_soup.select_one(".content") or promo_soup.select_one(".entry-content") or promo_soup.select_one(".page-content")
            content_text = self.normalize_space(content.get_text(" ", strip=True) if content else promo_soup.get_text(" ", strip=True))
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

    def _find_deadline(self, text: str) -> str | None:
        match = re.search(r"(\d{2}\.\d{2}\.\d{4})", text)
        if match:
            return datetime.strptime(match.group(1), "%d.%m.%Y").date().isoformat()
        return None
