from __future__ import annotations

import json
import os
from pathlib import Path

from apps.telegram_bot.bot import build_bot, build_dispatcher
from apps.telegram_bot.config import load_settings
from apps.telegram_bot.validator import validate_bot_contract, validate_project_files


def main() -> int:
    os.environ.setdefault("BOT_TOKEN", "123456:TEST_TOKEN_FOR_LOCAL_VALIDATION")
    os.environ.setdefault("WEBAPP_URL", "https://example.com/miniapp")
    os.environ.setdefault("PRIVACY_URL", "https://example.com/privacy")
    os.environ.setdefault("TELEGRAM_CHANNEL_USERNAME", "@medsearch_minsk")

    settings = load_settings()
    root = Path(__file__).resolve().parent

    file_validation = validate_project_files(root)
    contract_validation = validate_bot_contract(settings)

    bot = build_bot(settings)
    dispatcher = build_dispatcher()
    allowed_updates = dispatcher.resolve_used_update_types()

    payload = {
        "files_ok": file_validation.ok,
        "file_checks": file_validation.checks,
        "contract_ok": contract_validation.ok,
        "contract_checks": contract_validation.checks,
        "allowed_updates": allowed_updates,
        "bot_session_type": type(bot.session).__name__,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if file_validation.ok and contract_validation.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
