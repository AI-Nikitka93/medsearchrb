from __future__ import annotations

import logging
import re
import urllib.parse
import urllib.robotparser
from abc import ABC, abstractmethod
from collections.abc import Iterable

from bs4 import BeautifulSoup

from apps.scrapers.config import RuntimeConfig
from apps.scrapers.http_client import HttpClient
from apps.scrapers.models import ScrapeReport, SourceBatch, utc_now_iso


LOGGER = logging.getLogger(__name__)


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

    def trim_doctor_urls(self, urls: list[str]) -> list[str]:
        limit = self.config.max_doctors_per_source
        if limit > 0:
            return urls[:limit]
        return urls

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
