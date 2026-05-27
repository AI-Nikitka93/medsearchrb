from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class SuperDentScraper(GenericPromoSiteScraper):
    source_name = "superdent"
    base_url = "https://superdent.by"
    clinic_name = "Клиника эстетической стоматологии"
    clinic_external_id = "superdent-main"
    promo_paths = ("/akcii/",)
    allowed_seed_urls = (
        "https://superdent.by/",
        "https://superdent.by/akcii/",
    )
    link_path_markers = ("/akcii/", "/aktsii/", "/news/")
