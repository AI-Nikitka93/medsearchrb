from __future__ import annotations

import argparse
from dataclasses import asdict
import json
import logging

from apps.scrapers.config import load_runtime_config
from apps.scrapers.orchestrator import Orchestrator
from apps.scrapers.scrapers import SCRAPER_REGISTRY


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="MedsearchRB source batch scraper")
    parser.add_argument(
        "--sources",
        nargs="+",
        default=list(SCRAPER_REGISTRY.keys()),
        choices=sorted(SCRAPER_REGISTRY.keys()),
        help="List of scrapers to run",
    )
    parser.add_argument(
        "--output-mode",
        default="file",
        choices=["file", "ingest"],
        help="Write JSON batch to file or POST it to the ingest API",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Application log level",
    )
    return parser


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    configure_logging(args.log_level)

    config = load_runtime_config()
    orchestrator = Orchestrator(config)
    batches, output_path = orchestrator.run(args.sources, args.output_mode)

    summary = {
        "sources": args.sources,
        "output_mode": args.output_mode,
        "output_path": str(output_path) if output_path else None,
        "reports": [asdict(batch.report) if batch.report else {} for batch in batches],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
