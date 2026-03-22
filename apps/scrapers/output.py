from __future__ import annotations

import json
import logging
from pathlib import Path
from urllib import request

from apps.scrapers.models import SourceBatch


LOGGER = logging.getLogger(__name__)


def write_batch_file(target_path: Path, batches: list[SourceBatch]) -> Path:
    target_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "batch_count": len(batches),
        "sources": [batch.to_dict() for batch in batches],
    }
    target_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return target_path


def post_batch(ingest_url: str, token: str | None, batches: list[SourceBatch], timeout_seconds: int = 30) -> int:
    payload = json.dumps(
        {
            "batch_count": len(batches),
            "sources": [batch.to_dict() for batch in batches],
        },
        ensure_ascii=False,
    ).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "MedsearchRB-Scraper/1.0",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = request.Request(ingest_url, data=payload, method="POST", headers=headers)
    with request.urlopen(req, timeout=timeout_seconds) as response:  # noqa: S310
        status = int(response.status)
        LOGGER.info("Posted %s source batches to %s with status %s", len(batches), ingest_url, status)
        return status
