from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class MedicPlusScraper(GenericPromoSiteScraper):
    source_name = "medicplus"
    base_url = "https://medicplus.by"
    clinic_name = "Медик Плюс"
    clinic_external_id = "medicplus-main"
    promo_paths = ("/actions/",)
    allowed_seed_urls = (
        "https://medicplus.by/",
        "https://medicplus.by/actions/",
    )
    link_path_markers = ("/actions/", "/akcii/", "/news/")
