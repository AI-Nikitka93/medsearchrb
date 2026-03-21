from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]


def _load_environment() -> None:
    for candidate in (ROOT_DIR / ".env", ROOT_DIR / ".env.txt"):
        if candidate.exists():
            load_dotenv(candidate, override=False)


_load_environment()


def _normalize_channel_username(raw_value: str) -> str:
    value = raw_value.strip()
    if not value:
        return ""
    for prefix in ("https://t.me/", "http://t.me/", "t.me/"):
        if value.startswith(prefix):
            value = value[len(prefix) :]
            break
    if not value.startswith("@"):
        value = f"@{value}"
    return value


@dataclass(slots=True)
class BotSettings:
    bot_token: str
    admin_chat_id: int
    webapp_url: str
    privacy_url: str
    bot_description: str
    support_username: str
    telegram_channel_id: int | None
    telegram_channel_username: str | None


def load_settings() -> BotSettings:
    token = os.environ.get("BOT_TOKEN", "").strip()
    admin_chat_id_raw = os.environ.get("ADMIN_CHAT_ID", "6297262714").strip()
    channel_id_raw = os.environ.get("TELEGRAM_CHANNEL_ID", "").strip()
    channel_username_raw = os.environ.get("TELEGRAM_CHANNEL_USERNAME", "").strip()
    normalized_channel_username = _normalize_channel_username(channel_username_raw)

    return BotSettings(
        bot_token=token,
        admin_chat_id=int(admin_chat_id_raw),
        webapp_url=os.environ.get("WEBAPP_URL", "https://example.com/miniapp").strip(),
        privacy_url=os.environ.get("PRIVACY_URL", "https://example.com/privacy").strip(),
        bot_description=os.environ.get(
            "BOT_DESCRIPTION",
            "Поиск врачей Минска, отзывы и актуальные акции. Создано @AI_Nikitka93.",
        ).strip(),
        support_username=os.environ.get("SUPPORT_USERNAME", "@AI_Nikitka93").strip(),
        telegram_channel_id=int(channel_id_raw) if channel_id_raw else None,
        telegram_channel_username=normalized_channel_username or None,
    )


def validate_runtime_settings(settings: BotSettings) -> None:
    if not settings.bot_token:
        raise RuntimeError("BOT_TOKEN is not set. Create .env from .env.example and add the bot token.")
    if not settings.webapp_url.startswith("https://"):
        raise RuntimeError("WEBAPP_URL must start with https://")
    if not settings.privacy_url.startswith("https://"):
        raise RuntimeError("PRIVACY_URL must start with https://")
    if settings.telegram_channel_username and not settings.telegram_channel_username.startswith("@"):
        raise RuntimeError("TELEGRAM_CHANNEL_USERNAME must start with @")
