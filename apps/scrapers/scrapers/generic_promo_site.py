from __future__ import annotations

from datetime import date, datetime
import re

from apps.scrapers.models import ClinicRecord, PromotionRecord
from apps.scrapers.scrapers.base import BaseScraper


PROMO_KEYWORDS = (
    "акци",
    "скид",
    "скидк",
    "промо",
    "спецпредлож",
    "выгод",
    "подар",
    "сертификат",
    "чек-ап",
    "чекап",
    "комплекс",
    "sale",
    "discount",
    "promotion",
    "special offer",
)

TITLE_PROMO_KEYWORDS = (
    "акци",
    "скид",
    "промо",
    "спецпредлож",
    "выгод",
    "подар",
    "чек-ап",
    "чекап",
    "sale",
    "discount",
    "promotion",
    "special offer",
)

PROMO_URL_MARKERS = (
    "/akcii/",
    "/akciya/",
    "/aktsii/",
    "/actions/",
    "/promotions/",
    "/promo",
    "/sales/",
    "/shares/",
)

NON_PROMO_TITLE_PATTERNS = (
    r"^акции$",
    r"^скидки$",
    r"^новости$",
    r"^все акции$",
    r"^акции\s+.+$",
    r"^другие новости$",
    r"^подробнее$",
    r"^читать далее$",
    r"^ооо\b",
    r"лицензи[ия].*сертификат",
    r"сертификат.*лицензи",
    r"^сертификаты?$",
    r"^лицензии?$",
    r"положение\s+о.*сертификат",
    r"день профилактики",
    r"рады представить",
    r"новый метод лечения",
    r"premium[-\s]+диагностика",
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

STALE_PROMOTION_AGE_DAYS = 180


class GenericPromoSiteScraper(BaseScraper):
    clinic_name: str = ""
    clinic_external_id: str = ""
    promo_paths: tuple[str, ...] = ()
    archive_paths: tuple[str, ...] = ()
    link_path_markers: tuple[str, ...] = ()

    def collect(self):
        batch = self.empty_batch()
        clinic = self._extract_clinic()
        batch.clinics.append(clinic)
        batch.promotions.extend(self._extract_promotions(clinic.external_id))
        return batch

    def _extract_clinic(self) -> ClinicRecord:
        response = self.client.get_text(self.base_url, referer=self.base_url)
        return ClinicRecord(
            source=self.source_name,
            external_id=self.clinic_external_id,
            name=self.clinic_name,
            url=self.base_url,
            site_url=self.base_url,
            official_directory_url=self.absolute_url(self.promo_paths[0] if self.promo_paths else "/"),
            source_type="official_site",
            is_official=True,
            source_priority=10,
            verification_status="official_source",
            address=self._extract_minsk_address(response.text),
            source_url=response.url,
        )

    def _extract_promotions(self, clinic_external_id: str) -> list[PromotionRecord]:
        candidates: list[tuple[str, str, str | None]] = []
        seed_paths = self.promo_paths or self.archive_paths or ("/",)

        for path in seed_paths:
            archive_url = self.absolute_url(path)
            try:
                response = self.client.get_text(archive_url, referer=self.base_url)
            except Exception as exc:  # noqa: BLE001
                self.report.notes.append(f"archive_failed:{archive_url}:{exc}")
                continue

            soup = self.soup(response.text)
            page_title = self._extract_title(soup, response.text)
            page_text = self.normalize_space(soup.get_text(" ", strip=True))
            if (
                not self._is_archive_url(response.url)
                and self._looks_like_promotion(page_title, page_text)
                and not self._is_archive_title(page_title)
            ):
                candidates.append((response.url, page_title, self._find_published_on(soup, response.url)))

            for link in soup.select("a[href]"):
                href = link.get("href", "")
                absolute = self.absolute_url(href)
                if self._is_same_archive(absolute, archive_url):
                    continue
                title = self.normalize_space(link.get_text(" ", strip=True))
                if not self._is_candidate_link(absolute, title):
                    continue
                candidates.append((absolute, title, None))

        promotions: list[PromotionRecord] = []
        for promo_url, fallback_title, published_hint in self._unique_candidates(candidates):
            self.polite_sleep()
            try:
                detail = self.client.get_text(promo_url, referer=self.base_url)
            except Exception as exc:  # noqa: BLE001
                self.report.notes.append(f"detail_failed:{promo_url}:{exc}")
                continue

            soup = self.soup(detail.text)
            title = self._extract_title(soup, detail.text) or fallback_title
            title = self._clean_title(title)
            if not self._valid_promo_title(title):
                continue
            if self._is_archive_url(detail.url):
                continue

            content = (
                soup.select_one("article")
                or soup.select_one(".content")
                or soup.select_one(".entry-content")
                or soup.select_one(".page-content")
                or soup.select_one("main")
            )
            content_text = self.normalize_space(
                content.get_text(" ", strip=True) if content else soup.get_text(" ", strip=True),
            )
            if not self._looks_like_promotion(title, content_text):
                continue
            if not self._has_promo_signal(title, detail.url):
                continue
            if self._has_explicit_stale_year(title) or self._has_past_day_month_without_year(title):
                continue

            published_on = self._find_published_on(soup, detail.url) or published_hint
            valid_until = self._find_deadline(f"{title} {content_text}", published_on)
            if self._date_sensitive_title_without_date_evidence(title, valid_until, published_on):
                continue
            if self._is_stale_without_deadline(valid_until, published_on):
                continue
            if not self.promotion_is_active(title, content_text, valid_until):
                continue

            promotions.append(
                PromotionRecord(
                    source=self.source_name,
                    external_id=self._external_id_from_url(detail.url),
                    title=title,
                    url=detail.url,
                    clinic_external_id=clinic_external_id,
                    valid_until=valid_until,
                    published_at=published_on,
                    source_url=detail.url,
                ),
            )

        return promotions

    def _is_candidate_link(self, url: str, title: str) -> bool:
        normalized_title = self._clean_title(title).lower()
        if len(normalized_title) < 8 or not self._valid_promo_title(normalized_title):
            return False

        normalized_url = url.lower()
        has_promo_path_marker = any(marker in normalized_url for marker in PROMO_URL_MARKERS)
        return has_promo_path_marker or self._has_title_promo_signal(normalized_title)

    def _looks_like_promotion(self, title: str, text: str) -> bool:
        haystack = f"{title} {text}".lower()
        return any(keyword in haystack for keyword in PROMO_KEYWORDS)

    def _has_promo_signal(self, title: str, url: str) -> bool:
        normalized_url = url.lower()
        return any(marker in normalized_url for marker in PROMO_URL_MARKERS) or self._has_title_promo_signal(title)

    def _has_title_promo_signal(self, title: str) -> bool:
        normalized = self.normalize_space(title).lower()
        if re.search(r"\bакци", normalized):
            return True
        return any(keyword in normalized for keyword in TITLE_PROMO_KEYWORDS if keyword != "акци")

    def _extract_title(self, soup, html: str) -> str:
        for selector in ("h1", ".h1", ".title", ".entry-title", ".news-detail__title"):
            node = soup.select_one(selector)
            if node:
                title = self.normalize_space(node.get_text(" ", strip=True))
                if title:
                    return self._clean_title(title)

        meta = soup.select_one("meta[property='og:title']") or soup.select_one("meta[name='title']")
        if meta and meta.get("content"):
            return self._clean_title(str(meta.get("content")))

        match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        return self._clean_title(match.group(1) if match else "")

    def _clean_title(self, value: str) -> str:
        title = self.normalize_space(re.sub(r"\s*[|–—-]\s*.*$", "", value))
        return title.strip(" .")

    def _valid_promo_title(self, value: str) -> bool:
        normalized = self.normalize_space(value).lower()
        if len(normalized) < 8 or len(normalized) > 220:
            return False
        return not any(re.search(pattern, normalized) for pattern in NON_PROMO_TITLE_PATTERNS)

    def _is_archive_title(self, value: str) -> bool:
        normalized = self.normalize_space(value).lower()
        return normalized in {"акции", "скидки", "новости", "акции и скидки"}

    def _find_deadline(self, text: str, published_on: str | None) -> str | None:
        dotted_matches = re.findall(r"(\d{1,2}\.\d{1,2}\.\d{4})", text)
        if dotted_matches:
            for value in reversed(dotted_matches):
                parsed = self.parse_promotion_date(value)
                if parsed and parsed >= date.today():
                    return parsed.isoformat()

        range_match = re.search(
            r"(?:до|по)\s+(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?",
            text,
            re.IGNORECASE,
        )
        if range_match:
            parsed = self._parse_russian_date(
                range_match.group(1),
                range_match.group(2),
                range_match.group(3),
                published_on,
            )
            if parsed:
                return parsed

        return None

    def _parse_russian_date(
        self,
        day: str,
        month_name: str,
        year_value: str | None,
        published_on: str | None,
    ) -> str | None:
        month = RUS_MONTHS.get(month_name.lower())
        if not month:
            return None

        year = int(year_value) if year_value else None
        if year is None:
            published_date = self.parse_promotion_date(published_on)
            if not published_date:
                return None
            year = published_date.year

        try:
            return date(year, month, int(day)).isoformat()
        except ValueError:
            return None

    def _find_published_on(self, soup, url: str) -> str | None:
        for selector in ("time[datetime]", ".date", ".news-date", ".post-date"):
            node = soup.select_one(selector)
            if not node:
                continue
            value = node.get("datetime") or node.get_text(" ", strip=True)
            parsed = self._to_iso_date(value)
            if parsed:
                return parsed

        match = re.search(r"/(20\d{2})/(\d{1,2})/(\d{1,2})/", url)
        if match:
            return date(int(match.group(1)), int(match.group(2)), int(match.group(3))).isoformat()

        return None

    def _to_iso_date(self, value: str | None) -> str | None:
        if not value:
            return None

        parsed = self.parse_promotion_date(value)
        if parsed:
            return parsed.isoformat()

        normalized = self.normalize_space(value).lower()
        match = re.search(r"(\d{1,2})\s+([а-яё]+)\s+(20\d{2})", normalized)
        if match:
            return self._parse_russian_date(match.group(1), match.group(2), match.group(3), None)

        return None

    def _is_stale_without_deadline(self, valid_until: str | None, published_on: str | None) -> bool:
        if valid_until or not published_on:
            return False

        published_date = self.parse_promotion_date(published_on)
        if not published_date:
            return False

        return (date.today() - published_date).days > STALE_PROMOTION_AGE_DAYS

    def _has_explicit_stale_year(self, text: str) -> bool:
        current_year = date.today().year
        for raw_year in re.findall(r"\b(20\d{2})\b", text):
            year = int(raw_year)
            if year < current_year - 1:
                return True
        return False

    def _has_past_day_month_without_year(self, text: str) -> bool:
        normalized = self.normalize_space(text).lower()
        if re.search(r"\b20\d{2}\b", normalized):
            return False

        today = date.today()
        for day_value, month_name in re.findall(r"\b(\d{1,2})\s+([а-яё]+)\b", normalized):
            month = RUS_MONTHS.get(month_name)
            if not month:
                continue
            try:
                candidate = date(today.year, month, int(day_value))
            except ValueError:
                continue
            if candidate < today:
                return True
        return False

    def _date_sensitive_title_without_date_evidence(
        self,
        title: str,
        valid_until: str | None,
        published_on: str | None,
    ) -> bool:
        if valid_until or published_on:
            return False

        normalized = self.normalize_space(title).lower()
        if re.search(r"\bтолько\s+\d{1,2}\s+(?:день|дня|дней)\b", normalized):
            return True
        if re.search(r"\b(?:только|с|по|до)\s+\d{1,2}\s+[а-яё]+\b", normalized):
            return True
        return False

    def _extract_minsk_address(self, html: str) -> str:
        text = self.normalize_space(self.soup(html).get_text(" ", strip=True))
        match = re.search(
            r"(?:г\.\s*)?Минск[^.;\n]{0,120}?(?:ул\.|улица|просп\.|проспект|пер\.|переулок)[^.;\n]{3,90}",
            text,
            re.IGNORECASE,
        )
        return self.normalize_space(match.group(0)) if match else "Минск"

    def _is_same_archive(self, left: str, right: str) -> bool:
        return left.split("#", 1)[0].rstrip("/") == right.split("#", 1)[0].rstrip("/")

    def _is_archive_url(self, url: str) -> bool:
        normalized_path = re.sub(r"^https?://[^/]+", "", url.lower()).split("?", 1)[0].rstrip("/")
        if not normalized_path:
            normalized_path = "/"
        archive_paths = self.promo_paths or self.archive_paths
        return any(normalized_path == path.lower().rstrip("/") for path in archive_paths)

    def _unique_candidates(self, candidates: list[tuple[str, str, str | None]]) -> list[tuple[str, str, str | None]]:
        seen: set[str] = set()
        unique: list[tuple[str, str, str | None]] = []
        for url, title, published_on in candidates:
            normalized = url.split("#", 1)[0].rstrip("/")
            if normalized in seen:
                continue
            seen.add(normalized)
            unique.append((normalized, title, published_on))
        return unique

    def _external_id_from_url(self, url: str) -> str:
        slug = url.rstrip("/").split("/")[-1]
        return slug or re.sub(r"[^a-z0-9]+", "-", url.lower()).strip("-")
