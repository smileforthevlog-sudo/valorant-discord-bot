@echo off
setlocal
cd /d "%~dp0"

echo.
echo ==========================================
echo  Cosmetics V2 - Riot Agent Import R2
echo ==========================================
echo.

node scripts\import-riot-content-catalog-r2.mjs --base-url https://amazing-quokka-76fd8d.netlify.app
set IMPORT_EXIT=%ERRORLEVEL%

echo.
if "%IMPORT_EXIT%"=="0" (
  echo Phase 4B R2 agent import succeeded.
  echo.
  echo Do NOT deploy generated-netlify-assets yet.
  echo Return to ChatGPT with:
  echo   Phase 4B R2 succeeded
) else if "%IMPORT_EXIT%"=="2" (
  echo Import completed but validation failed.
  echo.
  echo Upload this file to ChatGPT:
  echo   generated-netlify-assets\IMPORT-REPORT.json
) else (
  echo Import failed. Copy the error above and send it to ChatGPT.
)

echo.
pause
exit /b %IMPORT_EXIT%
