from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class ParodentScraper(GenericPromoSiteScraper):
    source_name = "parodent"
    base_url = "https://parodent.by"
    clinic_name = "Пародент"
    clinic_external_id = "parodent-main"
    promo_paths = ("/akcii/",)
    allowed_seed_urls = (
        "https://parodent.by/",
        "https://parodent.by/akcii/",
    )
    link_path_markers = ("/akcii/", "/aktsii/", "/news/")
