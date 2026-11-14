@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\quick-start.ps1" %*
if errorlevel 1 pause
endlocal
