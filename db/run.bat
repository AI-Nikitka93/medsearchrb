@echo off
setlocal
set "ROOT=%~dp0.."
set "WORKER_DIR=%ROOT%\apps\worker"

call "%WORKER_DIR%\install.bat"
if errorlevel 1 exit /b 1

cd /d "%WORKER_DIR%"
npm run db:migrate
