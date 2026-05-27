from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class MerciMedScraper(GenericPromoSiteScraper):
    source_name = "mercimed"
    base_url = "https://mercimed.by"
    clinic_name = "Клиника «Мерси»"
    clinic_external_id = "mercimed-main"
    promo_paths = ("/news/", "/")
    allowed_seed_urls = (
        "https://mercimed.by/",
        "https://mercimed.by/news/",
    )
    link_path_markers = ("/news/", "/akcii/", "/aktsii/", "/promo")
