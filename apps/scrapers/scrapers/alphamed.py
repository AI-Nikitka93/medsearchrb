from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class AlphaMedScraper(GenericPromoSiteScraper):
    source_name = "alphamed"
    base_url = "https://alphamed.by"
    clinic_name = "Альфамед"
    clinic_external_id = "alphamed-main"
    promo_paths = ("/akcii/",)
    allowed_seed_urls = (
        "https://alphamed.by/",
        "https://alphamed.by/akcii/",
    )
    link_path_markers = ("/akcii/", "/aktsii/", "/news/")
