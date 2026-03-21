from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, Message

from apps.telegram_bot.config import BotSettings
from apps.telegram_bot.keyboards.main import (
    build_about_keyboard,
    build_main_menu_keyboard,
    build_privacy_keyboard,
)
from apps.telegram_bot.services.copy import (
    build_about_text,
    build_help_text,
    build_privacy_text,
    build_start_text,
)


router = Router(name="commands")


@router.message(CommandStart())
async def handle_start(message: Message, settings: BotSettings) -> None:
    await message.answer(
        build_start_text(settings),
        reply_markup=build_main_menu_keyboard(settings),
    )


@router.message(Command("help"))
async def handle_help(message: Message, settings: BotSettings) -> None:
    await message.answer(build_help_text(settings))


@router.message(Command("about"))
async def handle_about(message: Message, settings: BotSettings) -> None:
    await message.answer(
        build_about_text(settings),
        reply_markup=build_about_keyboard(settings),
    )


@router.message(Command("privacy"))
async def handle_privacy(message: Message, settings: BotSettings) -> None:
    await message.answer(
        build_privacy_text(settings),
        reply_markup=build_privacy_keyboard(settings),
    )


@router.callback_query(F.data == "bot:about")
async def handle_about_callback(callback: CallbackQuery, settings: BotSettings) -> None:
    if callback.message:
        await callback.message.answer(
            build_about_text(settings),
            reply_markup=build_about_keyboard(settings),
        )
    await callback.answer()


@router.callback_query(F.data == "bot:privacy")
async def handle_privacy_callback(callback: CallbackQuery, settings: BotSettings) -> None:
    if callback.message:
        await callback.message.answer(
            build_privacy_text(settings),
            reply_markup=build_privacy_keyboard(settings),
        )
    await callback.answer()
