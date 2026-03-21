from __future__ import annotations

import logging
from pathlib import Path

from apps.scrapers.config import RuntimeConfig
from apps.scrapers.http_client import HttpClient
from apps.scrapers.models import SourceBatch
from apps.scrapers.output import post_batch, write_batch_file
from apps.scrapers.scrapers import SCRAPER_REGISTRY


LOGGER = logging.getLogger(__name__)


class Orchestrator:
    def __init__(self, config: RuntimeConfig) -> None:
        self.config = config
        self.client = HttpClient(config)

    def run(self, sources: list[str], output_mode: str) -> tuple[list[SourceBatch], Path | None]:
        batches: list[SourceBatch] = []
        for source_name in sources:
            scraper_cls = SCRAPER_REGISTRY[source_name]
            scraper = scraper_cls(self.client, self.config)
            batch = scraper.scrape()
            batches.append(batch)

        output_path: Path | None = None
        if output_mode == "file":
            output_path = self.config.base_output_dir / "batches" / "latest-source-batch.json"
            write_batch_file(output_path, batches)
            LOGGER.info("Saved batch file to %s", output_path)
        elif output_mode == "ingest":
            if not self.config.ingest_url:
                raise RuntimeError("INGEST_URL is required for output_mode=ingest")
            post_batch(self.config.ingest_url, self.config.ingest_token, batches)
        else:
            raise RuntimeError(f"Unsupported output mode: {output_mode}")

        return batches, output_path
