from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class MedExpertScraper(GenericPromoSiteScraper):
    source_name = "medexpert"
    base_url = "https://medexpert.by"
    clinic_name = "Центр семейной стоматологии"
    clinic_external_id = "medexpert-main"
    promo_paths = ("/aktsii/",)
    allowed_seed_urls = (
        "https://medexpert.by/",
        "https://medexpert.by/aktsii/",
    )
    link_path_markers = ("/aktsii/", "/akcii/", "/news/")
