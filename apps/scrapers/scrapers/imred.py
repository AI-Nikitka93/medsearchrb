from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class ImredScraper(GenericPromoSiteScraper):
    source_name = "imred"
    base_url = "https://imred.by"
    clinic_name = "IMRED"
    clinic_external_id = "imred-main"
    promo_paths = ("/",)
    allowed_seed_urls = ("https://imred.by/",)
    link_path_markers = ("/akcii/", "/aktsii/", "/skid", "/news/")
