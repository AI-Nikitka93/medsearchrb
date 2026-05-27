from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class MedPraktikaScraper(GenericPromoSiteScraper):
    source_name = "medpraktika"
    base_url = "https://med-praktika.by"
    clinic_name = "Мед-Практика"
    clinic_external_id = "medpraktika-main"
    promo_paths = ("/novosti/",)
    allowed_seed_urls = (
        "https://med-praktika.by/",
        "https://med-praktika.by/novosti/",
    )
    link_path_markers = ("/novosti/", "/akcii/", "/aktsii/")
