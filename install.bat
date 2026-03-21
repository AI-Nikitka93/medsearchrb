@echo off
setlocal
set "ROOT=%~dp0"

python -m pip install --upgrade pip
if errorlevel 1 exit /b 1

python -m pip install -r "%ROOT%requirements.txt"
if errorlevel 1 exit /b 1

echo Dependencies installed.
