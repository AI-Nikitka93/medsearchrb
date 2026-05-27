from __future__ import annotations

from apps.scrapers.scrapers.generic_promo_site import GenericPromoSiteScraper


class MinskDentistScraper(GenericPromoSiteScraper):
    source_name = "minskdentist"
    base_url = "https://minskdentist.by"
    clinic_name = "Стоматология имени Жадовича"
    clinic_external_id = "minskdentist-main"
    promo_paths = ("/sale",)
    allowed_seed_urls = (
        "https://minskdentist.by/",
        "https://minskdentist.by/sale",
    )
    link_path_markers = ("/sale", "/akcii/", "/aktsii/")
