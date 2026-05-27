from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class OrtoClinicScraper(GenericPromoSiteScraper):
    source_name = "ortoclinic"
    base_url = "https://ortoclinic.by"
    clinic_name = "Ортоклиник"
    clinic_external_id = "ortoclinic-main"
    promo_paths = ("/novosti/",)
    allowed_seed_urls = (
        "https://ortoclinic.by/",
        "https://ortoclinic.by/novosti/",
    )
    link_path_markers = ("/novosti/", "/news/", "/akcii/", "/aktsii/")
