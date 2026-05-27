from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class DimedaScraper(GenericPromoSiteScraper):
    source_name = "dimeda"
    base_url = "https://dimeda.by"
    clinic_name = "Димеда"
    clinic_external_id = "dimeda-main"
    promo_paths = ("/news/",)
    allowed_seed_urls = (
        "https://dimeda.by/",
        "https://dimeda.by/news/",
    )
    link_path_markers = ("/news/", "/akcii/", "/aktsii/")
