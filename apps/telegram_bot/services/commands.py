from __future__ import annotations

from aiogram.types import BotCommand


def get_bot_commands() -> list[BotCommand]:
    return [
        BotCommand(command="start", description="Открыть главное меню"),
        BotCommand(command="help", description="Как пользоваться ботом"),
        BotCommand(command="about", description="О сервисе"),
        BotCommand(command="privacy", description="Политика конфиденциальности"),
    ]
