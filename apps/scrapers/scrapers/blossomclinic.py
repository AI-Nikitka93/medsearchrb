from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class BlossomClinicScraper(GenericPromoSiteScraper):
    source_name = "blossomclinic"
    base_url = "https://blossomclinic.by"
    clinic_name = "Блоссом Клиник"
    clinic_external_id = "blossomclinic-main"
    promo_paths = ("/news/",)
    allowed_seed_urls = (
        "https://blossomclinic.by/",
        "https://blossomclinic.by/news/",
    )
    link_path_markers = ("/news/", "/akcii/", "/aktsii/")
