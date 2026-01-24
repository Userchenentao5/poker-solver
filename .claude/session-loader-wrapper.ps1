# Session loader wrapper with proper UTF-8 encoding
# Fixed for Windows PowerShell

$Utf8NoBom = New-Object System.Text.UTF8Encoding $False
$LogFile = Join-Path $PSScriptRoot "..\.claude\hook-debug.log"
$ProjectRoot = Split-Path $PSScriptRoot -Parent

# Create log header
$Header = @"
================================
Hook triggered: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Working directory: $(Get-Location)
Project root: $ProjectRoot
"@

[System.IO.File]::AppendAllText($LogFile, $Header + "`n", $Utf8NoBom)

try {
    Set-Location $ProjectRoot

    [System.IO.File]::AppendAllText($LogFile, "Running: npx tsx .claude\session-loader.ts`n", $Utf8NoBom)

    # Use cmd /c to run npx
    $Output = cmd /c "npx tsx .claude\session-loader.ts 2>&1" 2>&1
    $ExitCode = $LASTEXITCODE

    # Write output to log
    if ($Output -is [array]) {
        $Output | ForEach-Object { [System.IO.File]::AppendAllText($LogFile, "$_`n", $Utf8NoBom) }
    } else {
        [System.IO.File]::AppendAllText($LogFile, "$Output`n", $Utf8NoBom)
    }

    [System.IO.File]::AppendAllText($LogFile, "Exit code: $ExitCode`n", $Utf8NoBom)

    # Output to console
    Write-Output $Output

    exit $ExitCode
}
catch {
    [System.IO.File]::AppendAllText($LogFile, "EXCEPTION: $($_.Exception.Message)`n", $Utf8NoBom)
    Write-Error $_.Exception.Message
    exit 1
}
