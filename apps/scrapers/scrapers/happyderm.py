from __future__ import annotations

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


PROMO_KEYWORDS = (
    "акци",
    "скид",
    "подар",
    "выгод",
    "комплекс",
    "эпиляц",
)


class HappyDermScraper(BaseScraper):
    source_name = "happyderm"
    base_url = "https://happyderm.by"
    allowed_seed_urls = (
        "https://happyderm.by/",
        "https://happyderm.by/news",
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
            external_id="happyderm-main",
            name="HappyDerm",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/news"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address="Минск",
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        response = self.client.get_text(self.absolute_url("/news"), referer=self.base_url)
        soup = self.soup(response.text)
        promo_candidates: list[tuple[str, str]] = []
        for link in soup.select("a[href^='/news/'], a[href*='happyderm.by/news/']"):
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
            self.polite_sleep()
            response = self.client.get_text(promo_url, referer=self.absolute_url("/news"))
            soup = self.soup(response.text)
            heading = soup.find("h1")
            title = self.normalize_space(heading.get_text(" ", strip=True) if heading else fallback_title)
            content = soup.select_one(".item-page") or soup.select_one(".com-content-article")
            content_text = self.normalize_space(content.get_text(" ", strip=True) if content else soup.get_text(" ", strip=True))
            if not any(keyword in content_text.lower() for keyword in PROMO_KEYWORDS):
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
