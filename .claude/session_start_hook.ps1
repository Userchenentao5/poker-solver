# SessionStart hook for Windows PowerShell
$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Set Python to use UTF-8
$env:PYTHONIOENCODING = "utf-8"

Set-Location (Split-Path -Parent $PSScriptRoot)

& "C:\Users\30952\AppData\Local\Programs\Python\Python310\python.exe" (Join-Path $PSScriptRoot "session_start_hook.py")
exit $LASTEXITCODE
