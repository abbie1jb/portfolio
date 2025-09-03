@echo off
echo Generating work manifest from WORK_DISPLAY folder structure...
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0generate-manifest.ps1"

pause
