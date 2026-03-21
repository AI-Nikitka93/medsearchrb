@echo off
setlocal
set "ROOT=%~dp0"
set "MODE=%~1"

if "%MODE%"=="" set "MODE=bot"

call "%ROOT%install.bat"
if errorlevel 1 goto :fail

if /I "%MODE%"=="scraper" goto :run_scraper

if exist "%ROOT%.env" goto :run_bot
if exist "%ROOT%.env.txt" goto :run_bot
goto :missing_env

:run_bot
python -m apps.telegram_bot.bot
if errorlevel 1 goto :fail

echo Bot run completed.
goto :eof

:run_scraper
python -m apps.scrapers.main --sources medart ydoc --output-mode file --log-level INFO
if errorlevel 1 goto :fail
echo Scraper run completed.
goto :eof

:missing_env
echo BLOCKED: BOT_TOKEN is missing. Create ".env" from ".env.example", then run "%ROOT%run.bat".
exit /b 1

:fail
exit /b 1
