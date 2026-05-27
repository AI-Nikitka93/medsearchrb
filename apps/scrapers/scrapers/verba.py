from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class VerbaScraper(GenericPromoSiteScraper):
    source_name = "verba"
    base_url = "https://verba.by"
    clinic_name = "Verba"
    clinic_external_id = "verba-main"
    promo_paths = ("/aktsii/",)
    allowed_seed_urls = (
        "https://verba.by/",
        "https://verba.by/aktsii/",
    )
    link_path_markers = ("/aktsii/", "/akcii/", "/news/")
