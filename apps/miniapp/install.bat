@echo off
setlocal
pushd "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo [SETUP] Node.js not found. Installing via winget...
  winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
  where node >nul 2>&1
  if errorlevel 1 (
    echo [BLOCKED] Node.js installation failed.
    popd
    exit /b 1
  )
)
call npm install
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
