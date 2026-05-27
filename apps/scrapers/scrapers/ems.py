from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class EmsScraper(GenericPromoSiteScraper):
    source_name = "ems"
    base_url = "https://ems.by"
    clinic_name = "Экомедсервис"
    clinic_external_id = "ems-main"
    promo_paths = ("/novosti/",)
    allowed_seed_urls = (
        "https://ems.by/",
        "https://ems.by/novosti/",
    )
    link_path_markers = ("/novosti/", "/news/", "/akcii/", "/aktsii/")
