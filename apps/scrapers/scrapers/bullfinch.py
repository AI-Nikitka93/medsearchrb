from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class BullfinchScraper(GenericPromoSiteScraper):
    source_name = "bullfinch"
    base_url = "https://bullfinch.by"
    clinic_name = "Bullfinch"
    clinic_external_id = "bullfinch-main"
    promo_paths = ("/news/",)
    allowed_seed_urls = (
        "https://bullfinch.by/",
        "https://bullfinch.by/news/",
    )
    link_path_markers = ("/news/", "/akcii/", "/aktsii/")
