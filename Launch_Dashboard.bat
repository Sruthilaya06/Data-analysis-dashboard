@echo off
setlocal EnableDelayedExpansion
title Data Analysis Dashboard - Offline Launcher

echo ===============================================================================
echo                DATA ANALYSIS DASHBOARD - PORTABLE EDITION
echo ===============================================================================
echo.
echo Starting offline application environment...
echo No internet connection, Node.js, Python, or administrative permissions required.
echo.

:: 1. Identify application directory from script location
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

:: 2. Check for Windows PowerShell availability
where powershell.exe >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Windows PowerShell was not found on your system.
    echo Windows 7, 8, 10, and 11 include PowerShell by default.
    echo Please verify that powershell.exe is accessible in PATH.
    echo.
    pause
    exit /b 1
)

:: 3. Verify that server.ps1 is present
if not exist "%APP_DIR%server.ps1" (
    echo.
    echo [ERROR] Required component 'server.ps1' is missing from:
    echo %APP_DIR%
    echo Please make sure the entire DataAnalysisDashboard folder was extracted.
    echo.
    pause
    exit /b 1
)

:: 4. Verify that index.html is present
if not exist "%APP_DIR%index.html" (
    echo.
    echo [ERROR] Required application asset 'index.html' is missing from:
    echo %APP_DIR%
    echo.
    pause
    exit /b 1
)

echo [OK] Application directory verified: %APP_DIR%
echo [OK] Launching single-instance localhost server...
echo.

:: 5. Launch PowerShell server
:: -ExecutionPolicy Bypass only applies to this single child process and requires NO admin rights.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%APP_DIR%server.ps1" -PreferredPort 8080

if %ERRORLEVEL% neq 0 (
    echo.
    echo [INFO] Server process ended.
    echo If this was unexpected, please review the messages above or check README.txt.
    echo.
    pause
)
