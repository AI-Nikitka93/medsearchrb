from __future__ import annotations

from aiogram.types import InlineKeyboardButton, WebAppInfo


def build_primary_webapp_button(text: str, url: str) -> InlineKeyboardButton:
    kwargs = {
        "text": text,
        "web_app": WebAppInfo(url=url),
    }
    try:
        return InlineKeyboardButton(style="primary", **kwargs)
    except Exception:  # noqa: BLE001
        return InlineKeyboardButton(**kwargs)


def build_secondary_callback_button(text: str, callback_data: str) -> InlineKeyboardButton:
    kwargs = {
        "text": text,
        "callback_data": callback_data,
    }
    try:
        return InlineKeyboardButton(style="success", **kwargs)
    except Exception:  # noqa: BLE001
        return InlineKeyboardButton(**kwargs)
