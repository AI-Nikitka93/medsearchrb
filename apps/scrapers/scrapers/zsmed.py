from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class ZsMedScraper(GenericPromoSiteScraper):
    source_name = "zsmed"
    base_url = "https://zsmed.by"
    clinic_name = "Золотое Сечение Мед"
    clinic_external_id = "zsmed-main"
    promo_paths = ("/novosti/",)
    allowed_seed_urls = (
        "https://zsmed.by/",
        "https://zsmed.by/novosti/",
    )
    link_path_markers = ("/novosti/", "/akcii/", "/aktsii/")
