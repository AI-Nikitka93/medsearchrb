from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class Makaenka17MedScraper(GenericPromoSiteScraper):
    source_name = "makaenka17med"
    base_url = "https://makaenka17med.by"
    clinic_name = "Медицинский центр на Макаенка 17"
    clinic_external_id = "makaenka17med-main"
    promo_paths = ("/",)
    allowed_seed_urls = ("https://makaenka17med.by/",)
    link_path_markers = ("/akcii/", "/aktsii/", "/news/", "/novosti/")
