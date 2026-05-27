from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class EksanaScraper(GenericPromoSiteScraper):
    source_name = "eksana"
    base_url = "https://eksana.by"
    clinic_name = "Эксана"
    clinic_external_id = "eksana-main"
    promo_paths = ("/news/",)
    allowed_seed_urls = (
        "https://eksana.by/",
        "https://eksana.by/news/",
    )
    link_path_markers = ("/news/", "/akcii/", "/aktsii/")
