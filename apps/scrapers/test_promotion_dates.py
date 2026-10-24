from __future__ import annotations

from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from apps.scrapers.scrapers.eclinic import EClinicScraper
from apps.scrapers.scrapers.forestmed import ForestMedScraper
from apps.scrapers.scrapers.lifecity import LifeCityScraper
from apps.scrapers.scrapers.mrtby import MrtByScraper
from apps.scrapers.scrapers.neomedical import NeoMedicalScraper
from apps.scrapers.scrapers.smartmedical import SmartMedicalScraper


RUS_MONTHS = (
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
)


class FakeClient:
    def __init__(self, pages: dict[str, str]) -> None:
        self.pages = pages

    def get_text(self, url: str, referer: str | None = None):
        if url not in self.pages:
            raise AssertionError(f"Unexpected URL requested by parser test: {url}")
        return SimpleNamespace(url=url, text=self.pages[url])


def _archive(url: str) -> str:
    return f'<a href="{url}">Акция: скидка 10%</a>'


def _detail(russian_date: str) -> str:
    return (
        "<html><h1>Акция: скидка 10%</h1>"
        f'<span class="date">{russian_date}</span>'
        "<article>Скидка 10 процентов на услугу.</article>"
        '<div class="content">Скидка 10 процентов на услугу.</div>'
        '<div class="entry-content">Скидка 10 процентов на услугу.</div>'
        '<div class="detail-text-wrap">Скидка 10 процентов на услугу.</div>'
        "</html>"
    )


@pytest.mark.parametrize(
    ("scraper_cls", "archive_paths", "promo_url_factory"),
    [
        (
            EClinicScraper,
            ("/news/", "/news/?PAGEN_1=2"),
            lambda today: f"/news/promo-{today:%Y%m%d}/",
        ),
        (
            ForestMedScraper,
            ("/akcii/",),
            lambda today: f"/{today:%Y/%m/%d}/akciya-skidka/",
        ),
        (
            MrtByScraper,
            ("/akcii/",),
            lambda today: "/akcii/akciya-skidka/",
        ),
        (
            NeoMedicalScraper,
            ("/akcii/", "/akcii/?PAGEN_1=2"),
            lambda today: "/akcii/akciya-skidka/",
        ),
        (
            SmartMedicalScraper,
            ("/news/", "/news/?PAGEN_1=2"),
            lambda today: "/news/akciya-skidka/",
        ),
    ],
)
def test_promo_parsers_preserve_published_date(
    scraper_cls,
    archive_paths: tuple[str, ...],
    promo_url_factory,
) -> None:
    today = date.today()
    published = today.isoformat()
    russian_date = f"{today.day} {RUS_MONTHS[today.month - 1]} {today.year}"
    promo_url = scraper_cls.base_url + promo_url_factory(today)
    pages = {
        scraper_cls.base_url + path: _archive(promo_url)
        for path in archive_paths
    }
    pages[promo_url] = _detail(russian_date)

    scraper = scraper_cls(
        client=FakeClient(pages),
        config=SimpleNamespace(source_config={}, selectors={}),
    )

    with patch.object(scraper, "polite_sleep"):
        promotions = scraper._extract_promotions("test-clinic")

    assert len(promotions) == 1
    assert promotions[0].valid_until is None
    assert promotions[0].published_at == published


def test_lifecity_preserves_publication_date_from_action_url() -> None:
    today = date.today()
    published = today.isoformat()
    promo_url = (
        f"https://lifecity.by/medical/actions-promo_"
        f"{today:%Y_%m_%d}.html"
    )
    scraper = LifeCityScraper(
        client=FakeClient({promo_url: _detail("unused")}),
        config=SimpleNamespace(source_config={}, selectors={}),
    )

    with (
        patch.object(scraper, "_extract_action_urls_from_sitemap", return_value=[promo_url]),
        patch.object(scraper, "polite_sleep"),
    ):
        promotions = scraper._extract_promotions("test-clinic")

    assert len(promotions) == 1
    assert promotions[0].valid_until is None
    assert promotions[0].published_at == published
