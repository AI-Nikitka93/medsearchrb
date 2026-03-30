from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from apps.telegram_bot.config import BotSettings
from apps.telegram_bot.utils.styled_buttons import (
    build_primary_webapp_button,
    build_secondary_callback_button,
)


def _build_channel_button(settings: BotSettings) -> InlineKeyboardButton | None:
    if not settings.telegram_channel_username:
        return None
    return InlineKeyboardButton(
        text="📣 Канал с обновлениями",
        url=f"https://t.me/{settings.telegram_channel_username.removeprefix('@')}",
    )


def _with_start_param(url: str, start_param: str | None = None) -> str:
    if not start_param:
        return url

    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query["start"] = start_param
    return urlunsplit(parts._replace(query=urlencode(query)))


def build_main_menu_keyboard(
    settings: BotSettings,
    start_param: str | None = None,
) -> InlineKeyboardMarkup:
    channel_button = _build_channel_button(settings)
    rows = [
        [build_primary_webapp_button("🔍 Найти врача", _with_start_param(settings.webapp_url, start_param))],
        [
            build_secondary_callback_button("ℹ️ О сервисе", "bot:about"),
            build_secondary_callback_button("🔐 Privacy", "bot:privacy"),
        ],
    ]
    if channel_button:
        rows.append([channel_button])

    return InlineKeyboardMarkup(
        inline_keyboard=rows
    )


def build_about_keyboard(settings: BotSettings) -> InlineKeyboardMarkup:
    rows = [
        [build_primary_webapp_button("🔍 Открыть Mini App", settings.webapp_url)],
    ]
    channel_button = _build_channel_button(settings)
    if channel_button:
        rows.append([channel_button])
    return InlineKeyboardMarkup(
        inline_keyboard=rows
    )


def build_privacy_keyboard(settings: BotSettings) -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text="🔐 Открыть политику", url=settings.privacy_url)],
        [build_primary_webapp_button("🔍 Перейти в Mini App", settings.webapp_url)],
    ]
    channel_button = _build_channel_button(settings)
    if channel_button:
        rows.append([channel_button])
    return InlineKeyboardMarkup(
        inline_keyboard=rows
    )
