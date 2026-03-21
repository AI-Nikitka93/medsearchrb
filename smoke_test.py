from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parent
    env = os.environ.copy()
    env.setdefault("MAX_DOCTORS_PER_SOURCE", "1")

    result = subprocess.run(
        [sys.executable, "-m", "apps.scrapers.main", "--sources", "medart", "ydoc", "--output-mode", "file"],
        cwd=root,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout)
    reports = payload.get("reports", [])
    if len(reports) != 2:
        raise SystemExit("Expected 2 scraper reports")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
