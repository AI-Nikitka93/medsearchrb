from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from apps.telegram_bot.config import BotSettings
from apps.telegram_bot.keyboards.main import build_main_menu_keyboard
from apps.telegram_bot.services.commands import get_bot_commands


@dataclass(slots=True)
class ValidationResult:
    ok: bool
    checks: list[str]


def validate_project_files(root: Path) -> ValidationResult:
    required = [
        root / ".env.example",
        root / "run.bat",
        root / "install.bat",
        root / "requirements.txt",
        root / "apps" / "telegram_bot" / "bot.py",
        root / "apps" / "telegram_bot" / "handlers" / "commands.py",
        root / "apps" / "telegram_bot" / "middlewares" / "throttling.py",
        root / "apps" / "telegram_bot" / "keyboards" / "main.py",
    ]
    checks = [f"exists:{path.name}" for path in required if path.exists()]
    return ValidationResult(ok=len(checks) == len(required), checks=checks)


def validate_bot_contract(settings: BotSettings) -> ValidationResult:
    keyboard = build_main_menu_keyboard(settings)
    commands = get_bot_commands()

    checks: list[str] = []
    button = keyboard.inline_keyboard[0][0]
    if button.text == "🔍 Найти врача":
        checks.append("main_button_text")
    if button.web_app and button.web_app.url == settings.webapp_url:
        checks.append("main_button_webapp_url")
    if button.model_dump(exclude_none=True).get("style") == "primary":
        checks.append("main_button_style_primary")
    if sorted(command.command for command in commands) == ["about", "help", "privacy", "start"]:
        checks.append("commands_registered")
    if settings.telegram_channel_username:
        has_channel_button = any(
            any(inner.text == "📣 Канал с обновлениями" for inner in row)
            for row in keyboard.inline_keyboard
        )
        if has_channel_button:
            checks.append("channel_button_present")

    expected_checks = 5 if settings.telegram_channel_username else 4
    return ValidationResult(ok=len(checks) == expected_checks, checks=checks)
