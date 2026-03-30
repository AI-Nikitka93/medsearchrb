from __future__ import annotations

from datetime import date, datetime
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


PROMO_TITLE_KEYWORDS = (
    "акци",
    "скид",
    "сертифик",
    "подар",
    "комплекс",
    "чек",
    "рассроч",
    "цена",
    "цены",
    "инъекцион",
    "лифтинг",
    "лечение",
    "удаление",
    "мигрен",
    "релатокс",
)

PROMO_CONTENT_KEYWORDS = PROMO_TITLE_KEYWORDS + (
    "запишитесь",
    "воспользоваться",
    "можете приобрести",
    "мы предлагаем",
    "доступны услуги",
)

NON_PROMO_TITLE_MARKERS = (
    "поздрав",
    "режим работы",
    "день профилактики",
    "день здоровья",
    "день отца",
    "день города",
    "день женщин",
    "день без табака",
    "международный день",
    "всемирный день",
    "выборы",
    "ветеран",
    "мандарин",
    "новая функция",
    "инвестиции в здоровье",
    "медицинской сестры",
    "заболеваемости",
    "коклюш",
    "корь",
    "белочк",
    "брифинг",
)

RUS_MONTHS = {
    "января": 1,
    "февраля": 2,
    "марта": 3,
    "апреля": 4,
    "мая": 5,
    "июня": 6,
    "июля": 7,
    "августа": 8,
    "сентября": 9,
    "октября": 10,
    "ноября": 11,
    "декабря": 12,
}

STALE_PROMOTION_AGE_DAYS = 500


class AquaMinskScraper(BaseScraper):
    source_name = "aquaminsk"
    base_url = "https://aquaminskclinic.by"
    allowed_seed_urls = (
        "https://aquaminskclinic.by/",
        "https://aquaminskclinic.by/news/",
    )

    def collect(self):
        batch = self.empty_batch()
        clinic = self._extract_clinic()
        if clinic:
            batch.clinics.append(clinic)
        batch.promotions.extend(self._extract_promotions(clinic.external_id if clinic else None))
        return batch

    def _extract_clinic(self) -> ClinicRecord:
        response = self.client.get_text(self.base_url, referer=self.base_url)
        return ClinicRecord(
            source=self.source_name,
            external_id="aquaminsk-main",
            name="Аква-Минск Клиника",
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url("/news/"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address="Минск, пр-т Рокоссовского, 44/2",
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str | None) -> list[PromotionRecord]:
        archive_urls = [
            self.absolute_url("/news/"),
            self.absolute_url("/news/?PAGEN_1=2"),
        ]
        promo_candidates: list[tuple[str, str, str | None]] = []

        for archive_url in archive_urls:
            response = self.client.get_text(archive_url, referer=self.absolute_url("/news/"))
            soup = self.soup(response.text)
            for item in soup.select(".item-views.list.image_left.news .item.wdate"):
                title_link = item.select_one(".title a")
                if not title_link:
                    continue

                title = self.normalize_space(title_link.get_text(" ", strip=True))
                promo_url = self.absolute_url(title_link.get("href", ""))
                published_on = self._parse_russian_date(
                    item.select_one(".period .label").get_text(" ", strip=True) if item.select_one(".period .label") else None,
                )

                if len(title) < 8 or self._is_non_promo_title(title):
                    continue
                if not any(keyword in title.lower() for keyword in PROMO_TITLE_KEYWORDS):
                    continue
                if self._is_stale_news_promotion(published_on):
                    continue

                promo_candidates.append((promo_url, title, published_on))

        promotions: list[PromotionRecord] = []
        for promo_url, fallback_title, published_on in self._unique_candidates(promo_candidates):
            self.polite_sleep()
            response = self.client.get_text(promo_url, referer=self.absolute_url("/news/"))
            soup = self.soup(response.text)
            heading = soup.find("h1")
            title = self.normalize_space(heading.get_text(" ", strip=True) if heading else fallback_title)
            if self._is_non_promo_title(title):
                continue

            content = soup.select_one(".detail.news .content") or soup.select_one(".content")
            content_text = self.normalize_space(content.get_text(" ", strip=True) if content else soup.get_text(" ", strip=True))
            if not any(keyword in f"{title} {content_text}".lower() for keyword in PROMO_CONTENT_KEYWORDS):
                continue

            detail_published_on = self._parse_russian_date(
                soup.select_one(".detail.news .period .label").get_text(" ", strip=True)
                if soup.select_one(".detail.news .period .label")
                else None,
            )
            published_value = detail_published_on or published_on
            if self._is_stale_news_promotion(published_value):
                continue
            if not self.promotion_is_active(title, content_text, None):
                continue

            promotions.append(
                PromotionRecord(
                    source=self.source_name,
                    external_id=promo_url.rstrip("/").split("/")[-1],
                    title=title,
                    url=promo_url,
                    clinic_external_id=clinic_external_id,
                    published_at=published_value,
                    source_url=response.url,
                )
            )

        return promotions

    def _unique_candidates(self, candidates: list[tuple[str, str, str | None]]) -> list[tuple[str, str, str | None]]:
        seen: set[str] = set()
        unique: list[tuple[str, str, str | None]] = []
        for url, title, published_on in candidates:
            if url in seen:
                continue
            seen.add(url)
            unique.append((url, title, published_on))
        return unique

    def _is_non_promo_title(self, title: str) -> bool:
        lowered = title.lower()
        return any(marker in lowered for marker in NON_PROMO_TITLE_MARKERS)

    def _is_stale_news_promotion(self, published_on: str | None) -> bool:
        if not published_on:
            return False

        published_date = self.parse_promotion_date(published_on)
        if not published_date:
            return False

        return (date.today() - published_date).days > STALE_PROMOTION_AGE_DAYS

    def _parse_russian_date(self, value: str | None) -> str | None:
        normalized = self.normalize_space(value).lower()
        match = re.fullmatch(r"(\d{1,2})\s+([а-яё]+)\s+(\d{4})", normalized)
        if not match:
            return None

        month = RUS_MONTHS.get(match.group(2))
        if not month:
            return None

        return datetime(int(match.group(3)), month, int(match.group(1))).date().isoformat()
