from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class ShineEstScraper(GenericPromoSiteScraper):
    source_name = "shineest"
    base_url = "https://www.shine-est.by"
    clinic_name = "Шайнэст"
    clinic_external_id = "shineest-main"
    promo_paths = ("/skidki",)
    allowed_seed_urls = (
        "https://www.shine-est.by/",
        "https://www.shine-est.by/skidki",
    )
    link_path_markers = ("/skidki", "/akcii/", "/aktsii/")
