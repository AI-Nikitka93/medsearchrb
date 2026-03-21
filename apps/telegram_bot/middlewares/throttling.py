from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject


class AntiFloodMiddleware(BaseMiddleware):
    def __init__(self, min_interval_seconds: float = 1.2) -> None:
        self.min_interval_seconds = min_interval_seconds
        self._last_seen: dict[tuple[int, str], float] = {}

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        user_id = self._extract_user_id(event)
        channel = type(event).__name__

        if user_id is None:
            return await handler(event, data)

        key = (user_id, channel)
        now = time.monotonic()
        previous = self._last_seen.get(key, 0.0)

        if now - previous < self.min_interval_seconds:
            await self._notify_limit(event)
            return None

        self._last_seen[key] = now
        return await handler(event, data)

    @staticmethod
    def _extract_user_id(event: TelegramObject) -> int | None:
        if isinstance(event, Message) and event.from_user:
            return event.from_user.id
        if isinstance(event, CallbackQuery) and event.from_user:
            return event.from_user.id
        return None

    @staticmethod
    async def _notify_limit(event: TelegramObject) -> None:
        text = "Слишком быстро. Подождите секунду и попробуйте снова."
        if isinstance(event, Message):
            await event.answer(text)
        elif isinstance(event, CallbackQuery):
            await event.answer(text, show_alert=False)
