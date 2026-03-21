from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from apps.telegram_bot.config import BotSettings, load_settings, validate_runtime_settings
from apps.telegram_bot.handlers.commands import router as commands_router
from apps.telegram_bot.handlers.errors import router as errors_router
from apps.telegram_bot.middlewares.throttling import AntiFloodMiddleware
from apps.telegram_bot.services.commands import get_bot_commands


LOGGER = logging.getLogger(__name__)


def build_bot(settings: BotSettings) -> Bot:
    return Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )


def build_dispatcher() -> Dispatcher:
    dispatcher = Dispatcher()
    dispatcher.message.middleware(AntiFloodMiddleware())
    dispatcher.callback_query.middleware(AntiFloodMiddleware())
    dispatcher.include_router(commands_router)
    dispatcher.include_router(errors_router)
    return dispatcher


async def run_polling() -> None:
    settings = load_settings()
    validate_runtime_settings(settings)

    bot = build_bot(settings)
    dispatcher = build_dispatcher()

    await bot.set_my_commands(get_bot_commands())
    await bot.delete_webhook(drop_pending_updates=True)

    LOGGER.info("Starting Telegram bot in polling mode")
    try:
        await dispatcher.start_polling(bot, settings=settings)
    finally:
        await bot.session.close()


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    asyncio.run(run_polling())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
