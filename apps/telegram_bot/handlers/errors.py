from __future__ import annotations

import logging

from aiogram import Router
from aiogram.types import ErrorEvent


router = Router(name="errors")
LOGGER = logging.getLogger(__name__)


@router.errors()
async def handle_global_error(event: ErrorEvent) -> bool:
    LOGGER.exception("Unhandled bot error", exc_info=event.exception)
    if hasattr(event.update, "message") and event.update.message:
        await event.update.message.answer("⚠️ Что-то пошло не так. Попробуйте ещё раз чуть позже.")
    return True
