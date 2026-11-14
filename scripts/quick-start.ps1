param(
  [int]$Port = 8787,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$entry = Join-Path $root "scripts\localdock-start.mjs"
$page = "http://127.0.0.1:$Port/"
$ping = "http://127.0.0.1:$Port/api/ping"

function Test-Heiss {
  try {
    $answer = Invoke-RestMethod -Uri $ping -TimeoutSec 1
    return $answer.app -eq "heiss-ui"
  } catch {
    return $false
  }
}

if (Test-Heiss) {
  Write-Host "[OK] HEISS Prompt Studio is already running: $page"
  if ($OpenBrowser) { Start-Process $page }
  exit 0
}

$listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
if ($listener) {
  Write-Host "[ERROR] Port $Port is already used by another program." -ForegroundColor Red
  exit 4
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$node = if ($nodeCommand) { $nodeCommand.Source } else { "" }
if (-not $node) {
  Write-Host "[ERROR] Node.js 20.9 or newer was not found in PATH." -ForegroundColor Red
  exit 2
}
if (-not (Test-Path -LiteralPath $entry)) {
  Write-Host "[ERROR] Launcher not found: $entry" -ForegroundColor Red
  exit 2
}

$logDir = Join-Path $env:TEMP "heiss-prompt-studio-logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stdout = Join-Path $logDir "start-$Port-$stamp.out.log"
$stderr = Join-Path $logDir "start-$Port-$stamp.err.log"

$env:PORT = [string]$Port
$env:HEISS_NO_BROWSER = "1"
$process = Start-Process `
  -FilePath $node `
  -ArgumentList @($entry, "--no-browser") `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

for ($attempt = 0; $attempt -lt 80; $attempt += 1) {
  Start-Sleep -Milliseconds 250
  if (Test-Heiss) {
    Write-Host "[OK] HEISS Prompt Studio started: $page"
    if ($OpenBrowser) { Start-Process $page }
    exit 0
  }
  if ($process.HasExited) {
    Write-Host "[ERROR] HEISS Prompt Studio exited during startup." -ForegroundColor Red
    if (Test-Path $stderr) { Get-Content $stderr -Tail 20 }
    if (Test-Path $stdout) { Get-Content $stdout -Tail 20 }
    exit 3
  }
}

Write-Host "[ERROR] HEISS Prompt Studio did not answer within 20 seconds." -ForegroundColor Red
Write-Host "Log directory: $logDir"
exit 5
