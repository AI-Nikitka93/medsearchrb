from __future__ import annotations

from datetime import date
import re
import urllib.request
import xml.etree.ElementTree as ET

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


STALE_PROMOTION_AGE_DAYS = 120


class LifeCityScraper(BaseScraper):
    source_name = "lifecity"
    base_url = "https://lifecity.by"
    allowed_seed_urls = (
        "https://lifecity.by/",
        "https://lifecity.by/sitemap.xml",
        "https://lifecity.by/medical/actions.html",
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
            external_id="lifecity-main",
            name="Лайф Сити",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/medical/actions.html"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address="Минск",
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        promotions: list[PromotionRecord] = []
        for promo_url in self._extract_action_urls_from_sitemap():
            self.polite_sleep()
            response = self.client.get_text(promo_url, referer=self.absolute_url("/medical/actions.html"))
            soup = self.soup(response.text)
            heading = soup.find("h1")
            title = self.normalize_space(heading.get_text(" ", strip=True) if heading else "")
            if not title:
                continue
            content_text = self.normalize_space(soup.get_text(" ", strip=True))
            valid_until = self._find_deadline(content_text)
            published_on = self._find_published_on_from_url(promo_url)
            if self._is_stale_news_promotion(valid_until, published_on):
                continue
            if not self.promotion_is_active(title, content_text, valid_until):
                continue
            promotions.append(
                PromotionRecord(
                    source=self.source_name,
                    external_id=promo_url.rstrip("/").split("/")[-1].replace(".html", ""),
                    title=title,
                    url=promo_url,
                    clinic_external_id=clinic_external_id,
                    valid_until=valid_until,
                    source_url=response.url,
                )
            )
        return promotions

    def _extract_action_urls_from_sitemap(self) -> list[str]:
        request = urllib.request.Request(
            self.absolute_url("/sitemap.xml"),
            headers={"User-Agent": self.config.user_agent},
        )
        with urllib.request.urlopen(request, timeout=self.config.request_timeout_seconds) as response:
            xml_text = response.read().decode("utf-8", "ignore")

        root = ET.fromstring(xml_text)
        namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls: list[str] = []
        for loc in root.findall("sm:url/sm:loc", namespace):
            value = self.normalize_space(loc.text)
            if "/medical/actions-" not in value:
                continue
            urls.append(value)
        return self.unique_urls(urls)

    def _find_deadline(self, text: str) -> str | None:
        match = re.search(r"до\s+(\d{2}\.\d{2}\.\d{4})", text)
        if match:
            parsed = self.parse_promotion_date(match.group(1))
            return parsed.isoformat() if parsed else None
        return None

    def _find_published_on_from_url(self, url: str) -> str | None:
        match = re.search(r"_(\d{4})_(\d{2})_(\d{2})\.html?$", url)
        if not match:
            return None
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3))).isoformat()

    def _is_stale_news_promotion(self, valid_until: str | None, published_on: str | None) -> bool:
        if valid_until or not published_on:
            return False

        published_date = self.parse_promotion_date(published_on)
        if not published_date:
            return False

        return (date.today() - published_date).days > STALE_PROMOTION_AGE_DAYS
