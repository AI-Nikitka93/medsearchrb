from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


DEFAULT_CONFIG_PATH = Path("config.yaml")
DEFAULT_SELECTORS_PATH = Path("selectors.yaml")


@dataclass(slots=True)
class RuntimeConfig:
    app_name: str
    base_output_dir: Path
    ingest_url: str | None
    ingest_token: str | None
    max_doctors_per_source: int
    min_delay_seconds: float
    max_delay_seconds: float
    request_timeout_seconds: int
    max_attempts: int
    user_agent: str
    source_config: dict[str, dict[str, Any]]
    selectors: dict[str, Any]


def _expand_path(path_value: str) -> Path:
    expanded = os.path.expandvars(path_value)
    expanded = re.sub(r"%([^%]+)%", lambda match: os.environ.get(match.group(1), match.group(0)), expanded)
    return Path(expanded).expanduser()


def _default_output_dir() -> Path:
    if sys.platform.startswith("win"):
        base = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
        return Path(base) / "MedsearchRB" / "scraper"
    return Path.home() / ".local" / "share" / "MedsearchRB" / "scraper"


def load_yaml_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def load_runtime_config(
    config_path: Path = DEFAULT_CONFIG_PATH,
    selectors_path: Path = DEFAULT_SELECTORS_PATH,
) -> RuntimeConfig:
    raw = load_yaml_file(config_path)
    selectors = load_yaml_file(selectors_path)

    runtime = raw.get("runtime", {})
    http = raw.get("http", {})

    output_dir_value = os.environ.get("MEDSEARCH_OUTPUT_DIR") or runtime.get("output_dir")
    output_dir = _expand_path(output_dir_value) if output_dir_value else _default_output_dir()
    if "%" in str(output_dir):
        output_dir = _default_output_dir()
    ingest_url = os.environ.get("INGEST_URL", runtime.get("ingest_url"))
    ingest_token = os.environ.get("INGEST_TOKEN", runtime.get("ingest_token"))

    return RuntimeConfig(
        app_name=raw.get("app_name", "MedsearchRB"),
        base_output_dir=output_dir,
        ingest_url=ingest_url,
        ingest_token=ingest_token,
        max_doctors_per_source=int(os.environ.get("MAX_DOCTORS_PER_SOURCE", runtime.get("max_doctors_per_source", 5))),
        min_delay_seconds=float(http.get("min_delay_seconds", 2.2)),
        max_delay_seconds=float(http.get("max_delay_seconds", 4.8)),
        request_timeout_seconds=int(http.get("timeout_seconds", 25)),
        max_attempts=int(http.get("max_attempts", 4)),
        user_agent=http.get(
            "user_agent",
            (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
            ),
        ),
        source_config=raw.get("sources", {}),
        selectors=selectors,
    )
