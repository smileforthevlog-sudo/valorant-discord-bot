@echo off
setlocal
cd /d "%~dp0"

echo.
echo ==========================================
echo  Cosmetics V2 - Rank Emblem Import
echo ==========================================
echo.

node scripts\import-valorant-api-ranks.mjs --base-url https://amazing-quokka-76fd8d.netlify.app
set IMPORT_EXIT=%ERRORLEVEL%

echo.
if "%IMPORT_EXIT%"=="0" (
  echo Phase 4C rank import succeeded.
  echo.
  echo Do NOT deploy generated-netlify-assets yet.
  echo Return to ChatGPT with:
  echo   Phase 4C import succeeded
) else (
  echo Phase 4C rank import failed.
  echo.
  echo If this file exists, upload it to ChatGPT:
  echo   generated-netlify-assets\RANK-IMPORT-REPORT.json
)

echo.
pause
exit /b %IMPORT_EXIT%
