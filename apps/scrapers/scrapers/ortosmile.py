from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class OrtoSmileScraper(GenericPromoSiteScraper):
    source_name = "ortosmile"
    base_url = "https://ortosmile.by"
    clinic_name = "Ортосмайл"
    clinic_external_id = "ortosmile-main"
    promo_paths = ("/aktsii/",)
    allowed_seed_urls = (
        "https://ortosmile.by/",
        "https://ortosmile.by/aktsii/",
    )
    link_path_markers = ("/aktsii/", "/akcii/", "/novosti/")
