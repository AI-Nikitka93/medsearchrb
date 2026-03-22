from __future__ import annotations

import json
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


class LighthouseScraper(BaseScraper):
    source_name = "lighthouse"
    base_url = "https://lighthouse.by"
    allowed_seed_urls = (
        "https://lighthouse.by/",
        "https://lighthouse.by/promotions/",
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
        soup = self.soup(response.text)

        clinic_name = "Маяк Здоровья"
        address: str | None = None

        for script in soup.select("script[type='application/ld+json']"):
            try:
                payload = json.loads(script.get_text(strip=True))
            except json.JSONDecodeError:
                continue

            items = payload.get("@graph") if isinstance(payload, dict) and isinstance(payload.get("@graph"), list) else [payload]
            for item in items:
                if not isinstance(item, dict):
                    continue
                item_name = self.normalize_space(item.get("name"))
                if item_name and "маяк" in item_name.lower():
                    item_address = item.get("address")
                    if isinstance(item_address, dict):
                        address = ", ".join(
                            filter(
                                None,
                                [
                                    item_address.get("streetAddress"),
                                    item_address.get("addressLocality"),
                                ],
                            )
                        ) or address

        address_match = re.search(r"г\.\s*Минск,\s*ул\.\s*([А-Яа-яA-Za-zЁё.\-\s]+,\s*\d+[A-Яа-яA-Za-z\-\/]*)", response.text)
        if address_match:
            address = self.normalize_space(f"Минск, ул. {address_match.group(1)}")

        return ClinicRecord(
            source=self.source_name,
            external_id="lighthouse-main",
            name=clinic_name,
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/promotions/"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address=address,
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        archive_response = self.client.get_text(self.absolute_url("/promotions/"), referer=self.base_url)
        archive_soup = self.soup(archive_response.text)

        promo_urls: list[str] = []
        for link in archive_soup.select("a[href*='/promotions/']"):
            href = link.get("href", "")
            absolute = self.absolute_url(href)
            if absolute.rstrip("/") == self.absolute_url("/promotions").rstrip("/"):
                continue
            if "/promotions/" not in absolute:
                continue
            promo_urls.append(absolute)

        promotions: list[PromotionRecord] = []
        for promo_url in self.unique_urls(promo_urls):
            self.client.sleep_with_jitter()
            promo_response = self.client.get_text(promo_url, referer=self.absolute_url("/promotions/"))
            promo_soup = self.soup(promo_response.text)

            heading = promo_soup.find("h1")
            title = self.normalize_space(heading.get_text(" ", strip=True) if heading else "")
            if not title:
                continue

            content = promo_soup.select_one(".entry-content")
            content_text = self.normalize_space(content.get_text(" ", strip=True) if content else promo_soup.get_text(" ", strip=True))
            valid_until = self._find_deadline(content_text)

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
            return match.group(1)
        return None
