from __future__ import annotations

import logging
import random
import time
from dataclasses import dataclass
from urllib.parse import urlparse

from curl_cffi import requests as cffi_requests

from apps.scrapers.config import RuntimeConfig


LOGGER = logging.getLogger(__name__)


class ScraperHttpError(RuntimeError):
    """Raised when the scraper client exhausts its retries."""


@dataclass(slots=True)
class ResponseSnapshot:
    url: str
    status_code: int
    text: str
    content: bytes
    headers: dict[str, str]


class HttpClient:
    def __init__(self, config: RuntimeConfig) -> None:
        self._config = config
        self._session = cffi_requests.Session(impersonate="chrome136")
        self._session.headers.update(
            {
                "User-Agent": config.user_agent,
                "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "DNT": "1",
            }
        )

    def sleep_with_jitter(self) -> None:
        delay = random.uniform(self._config.min_delay_seconds, self._config.max_delay_seconds)
        time.sleep(delay)

    def get_text(self, url: str, referer: str | None = None) -> ResponseSnapshot:
        headers = {}
        if referer:
            headers["Referer"] = referer
        verify_tls = not self._allow_insecure_tls(url)

        for attempt in range(1, self._config.max_attempts + 1):
            try:
                response = self._session.get(
                    url,
                    headers=headers,
                    timeout=self._config.request_timeout_seconds,
                    verify=verify_tls,
                )
            except Exception as exc:  # noqa: BLE001
                if attempt >= self._config.max_attempts:
                    raise ScraperHttpError(f"GET {url} failed after {attempt} attempts: {exc}") from exc
                self._backoff(attempt, None)
                continue

            status_code = response.status_code
            if status_code == 429:
                retry_after = self._parse_retry_after(response.headers.get("Retry-After"))
                if attempt >= self._config.max_attempts:
                    raise ScraperHttpError(f"GET {url} returned HTTP 429 too many times")
                self._backoff(attempt, retry_after)
                continue

            if status_code >= 500:
                if attempt >= self._config.max_attempts:
                    raise ScraperHttpError(f"GET {url} returned {status_code} after retries")
                self._backoff(attempt, None)
                continue

            if status_code >= 400:
                raise ScraperHttpError(f"GET {url} returned unexpected HTTP {status_code}")

            return ResponseSnapshot(
                url=str(response.url),
                status_code=status_code,
                text=response.text,
                content=bytes(response.content),
                headers=dict(response.headers),
            )

        raise ScraperHttpError(f"GET {url} failed unexpectedly")

    def _backoff(self, attempt: int, retry_after: int | None) -> None:
        delay = retry_after if retry_after is not None else min(60, (2 ** attempt) + random.uniform(0.5, 2.0))
        LOGGER.warning("Retrying after %.2fs (attempt %s)", delay, attempt)
        time.sleep(delay)

    @staticmethod
    def _parse_retry_after(value: str | None) -> int | None:
        if not value:
            return None
        try:
            return int(value)
        except ValueError:
            return None

    def _allow_insecure_tls(self, url: str) -> bool:
        host = urlparse(url).hostname or ""
        if not host:
            return False

        source_settings = self._config.source_config.get(host, {})
        return bool(source_settings.get("insecure_tls"))
