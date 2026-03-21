from __future__ import annotations

from apps.telegram_bot.config import BotSettings


def _build_channel_line(settings: BotSettings) -> str:
    if not settings.telegram_channel_username:
        return ""
    return f"\nТакже можно подписаться на канал с обновлениями и акциями: {settings.telegram_channel_username}"


def build_start_text(settings: BotSettings) -> str:
    return (
        "Привет! Я помогаю быстро сориентироваться по врачам Минска.\n\n"
        "Здесь можно:\n"
        "• найти врача по нужной специальности;\n"
        "• сравнить отзывы и сигналы доверия;\n"
        "• увидеть актуальные акции частных клиник.\n\n"
        "Нажмите кнопку ниже, чтобы открыть Mini App и начать поиск."
        f"{_build_channel_line(settings)}"
    )


def build_help_text(settings: BotSettings) -> str:
    return (
        "Команды бота:\n"
        "/start — открыть главное приветствие и кнопку поиска\n"
        "/help — подсказка по использованию\n"
        "/about — что умеет сервис\n"
        "/privacy — политика конфиденциальности\n\n"
        f"Если заметите неточность, напишите в поддержку: {settings.support_username}"
        f"{_build_channel_line(settings)}"
    )


def build_about_text(settings: BotSettings) -> str:
    return (
        "Это Telegram-бот агрегатора врачей Минска.\n\n"
        "Мы не оказываем медицинские услуги и не записываем к врачу внутри бота. "
        "Бот помогает понять, куда идти: показывает врачей, клиники, отзывы и акции, "
        "а затем ведёт в Mini App для поиска и перехода к оригинальной записи.\n\n"
        f"{settings.bot_description}"
        f"{_build_channel_line(settings)}"
    )


def build_privacy_text(settings: BotSettings) -> str:
    return (
        "Политика конфиденциальности скоро будет доступна по постоянной ссылке.\n"
        f"Текущая ссылка для Mini App: {settings.privacy_url}"
    )
