@echo off
REM Generate WORK_DISPLAY/manifest.json by running the PowerShell generator.
REM Usage: double-click this .bat or run from cmd: WORK_DISPLAY\generate-work-manifest.bat
REM Requires Windows PowerShell (ships with Windows). The .bat will call the PS1 located in the scripts folder.

SETLOCAL
REM %~dp0 is the directory of this batch file (always ends with a backslash)
SET "SCRIPT_DIR=%~dp0"
REM Go up one level to the project root, then into scripts folder
SET "PS_SCRIPT=%SCRIPT_DIR%..\scripts\generate-work-manifest.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"
ENDLOCAL

REM Pause so the console output remains visible when double-clicking
pause
