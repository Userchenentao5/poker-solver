@echo off
REM Polyglot wrapper for running hook scripts
setlocal

if "%~1"=="" (
    echo run-hook.cmd: missing script name ^>&2
    exit /b 1
)

set SCRIPT_NAME=%~1
set SCRIPT_DIR=%~dp0
set SCRIPT_PATH=%SCRIPT_DIR%%SCRIPT_NAME%

REM Check if Node.js is available
where node >NUL 2>&1
if %ERRORLEVEL% EQU 0 (
    node "%SCRIPT_PATH%" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)

REM Check if Python is available
where python >NUL 2>&1
if %ERRORLEVEL% EQU 0 (
    python "%SCRIPT_PATH%" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)

echo Error: Neither Node.js nor Python found >&2
exit /b 1
