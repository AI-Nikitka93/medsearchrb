@echo off
setlocal
cd /d "%~dp0"
call "%~dp0install.bat"
if errorlevel 1 exit /b 1
npm run dev
