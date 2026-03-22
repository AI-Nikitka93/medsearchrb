from __future__ import annotations

from datetime import date, datetime
import logging
import os
import re
import time
import urllib.parse
import urllib.robotparser
from abc import ABC, abstractmethod
from collections.abc import Iterable

from bs4 import BeautifulSoup

from apps.scrapers.config import RuntimeConfig
from apps.scrapers.http_client import HttpClient
from apps.scrapers.models import ScrapeReport, SourceBatch, utc_now_iso


LOGGER = logging.getLogger(__name__)

PROMOTION_ENDED_MARKERS = (
    "акция завершена",
    "акция завершилась",
    "акция завершен",
    "предложение завершено",
    "предложение завершилась",
    "предложение завершено",
    "предложение не действует",
    "акция не действует",
    "скидка не действует",
    "предложение более не действует",
    "акция более не действует",
    "акция окончена",
    "акция окончилась",
)


class BaseScraper(ABC):
    source_name: str = ""
    base_url: str = ""
    allowed_seed_urls: tuple[str, ...] = ()

    def __init__(self, client: HttpClient, config: RuntimeConfig) -> None:
        self.client = client
        self.config = config
        self.report = ScrapeReport(source=self.source_name, status="started")
        self.source_settings = config.source_config.get(self.source_name, {})

    def scrape(self) -> SourceBatch:
        self.report.started_at = utc_now_iso()
        try:
            if not self._robots_allow():
                self.report.status = "skipped_by_robots"
                self.report.notes.append("robots.txt forbids one of the configured paths")
                return self.empty_batch()

            batch = self.collect()
            self.report.status = "ok"
            self.report.finished_at = utc_now_iso()
            self.report.doctors_found = len(batch.doctors)
            self.report.clinics_found = len(batch.clinics)
            self.report.promotions_found = len(batch.promotions)
            self.report.review_summaries_found = len(batch.review_summaries)
            batch.report = self.report
            return batch
        except Exception as exc:  # noqa: BLE001
            LOGGER.exception("Scraper %s failed", self.source_name)
            self.report.status = "failed"
            self.report.notes.append(str(exc))
            self.report.finished_at = utc_now_iso()
            batch = self.empty_batch()
            batch.report = self.report
            return batch

    def empty_batch(self) -> SourceBatch:
        return SourceBatch(source=self.source_name, captured_at=utc_now_iso(), report=self.report)

    @abstractmethod
    def collect(self) -> SourceBatch:
        raise NotImplementedError

    def soup(self, html: str) -> BeautifulSoup:
        return BeautifulSoup(html, "html.parser")

    def absolute_url(self, path_or_url: str) -> str:
        return urllib.parse.urljoin(self.base_url, path_or_url)

    def normalize_space(self, value: str | None) -> str:
        return re.sub(r"\s+", " ", (value or "")).strip()

    def unique_urls(self, urls: Iterable[str]) -> list[str]:
        seen: set[str] = set()
        unique: list[str] = []
        for url in urls:
            normalized = self.absolute_url(url)
            if normalized in seen:
                continue
            seen.add(normalized)
            unique.append(normalized)
        return unique

    def doctor_limit_reached(self, current_count: int) -> bool:
        limit = self.config.max_doctors_per_source
        return limit > 0 and current_count >= limit

    def polite_sleep(self) -> None:
        crawl_delay_seconds = self.source_settings.get("crawl_delay_seconds")
        if isinstance(crawl_delay_seconds, (int, float)) and crawl_delay_seconds > 0:
            time.sleep(float(crawl_delay_seconds))
            return

        self.client.sleep_with_jitter()

    def trim_doctor_urls(self, urls: list[str]) -> list[str]:
        limit = self.config.max_doctors_per_source
        if limit > 0:
            return urls[:limit]
        return urls

    def env_int(self, name: str, default: int = 0, minimum: int | None = None) -> int:
        raw = os.environ.get(name)
        if raw is None or raw == "":
            value = default
        else:
            try:
                value = int(raw)
            except ValueError:
                value = default

        if minimum is not None:
            return max(minimum, value)
        return value

    def slice_urls_with_env(
        self,
        urls: list[str],
        *,
        offset_env: str,
        limit_env: str,
    ) -> list[str]:
        offset = self.env_int(offset_env, default=0, minimum=0)
        limit = self.env_int(limit_env, default=0, minimum=0)

        sliced = urls[offset:]
        if limit > 0:
            sliced = sliced[:limit]
        return sliced

    def promotion_has_end_marker(self, *values: str | None) -> bool:
        haystack = " ".join(self.normalize_space(value).lower() for value in values if value)
        if not haystack:
            return False
        return any(marker in haystack for marker in PROMOTION_ENDED_MARKERS)

    def parse_promotion_date(self, value: str | None) -> date | None:
        normalized = self.normalize_space(value)
        if not normalized:
            return None

        iso_match = re.match(r"^(\d{4})-(\d{2})-(\d{2})", normalized)
        if iso_match:
            return date(
                int(iso_match.group(1)),
                int(iso_match.group(2)),
                int(iso_match.group(3)),
            )

        dotted_match = re.match(r"^(\d{2})\.(\d{2})\.(\d{4})$", normalized)
        if dotted_match:
            return date(
                int(dotted_match.group(3)),
                int(dotted_match.group(2)),
                int(dotted_match.group(1)),
            )

        try:
            return datetime.fromisoformat(normalized.replace("Z", "+00:00")).date()
        except ValueError:
            return None

    def promotion_is_expired(self, valid_until: str | None) -> bool:
        parsed = self.parse_promotion_date(valid_until)
        if not parsed:
            return False
        return parsed < date.today()

    def promotion_is_active(
        self,
        title: str | None,
        content_text: str | None = None,
        valid_until: str | None = None,
    ) -> bool:
        if self.promotion_has_end_marker(title, content_text):
            return False
        if self.promotion_is_expired(valid_until):
            return False
        return True

    def _robots_allow(self) -> bool:
        parser = urllib.robotparser.RobotFileParser()
        parser.set_url(self.absolute_url("/robots.txt"))
        try:
            parser.read()
        except Exception as exc:  # noqa: BLE001
            self.report.notes.append(f"robots_read_failed:{exc}")
            return False

        seed_urls = self.allowed_seed_urls or (self.base_url,)
        for url in seed_urls:
            if not parser.can_fetch(self.config.user_agent, url):
                return False
        return True
