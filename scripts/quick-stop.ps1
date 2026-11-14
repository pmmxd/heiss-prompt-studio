param(
  [int]$Port = 8787
)

$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$childPids = [System.Collections.Generic.HashSet[int]]::new()
$parentPids = [System.Collections.Generic.HashSet[int]]::new()

function Contains-ProjectPath([string]$CommandLine) {
  return $CommandLine -and $CommandLine.IndexOf($root, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
}

$listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
foreach ($listener in $listeners) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
  if (-not $process) { continue }
  if ((Contains-ProjectPath $process.CommandLine) -and ($process.CommandLine -match "server\\index\.js")) {
    [void]$childPids.Add([int]$process.ProcessId)
    if ($process.ParentProcessId) {
      [void]$parentPids.Add([int]$process.ParentProcessId)
    }
  }
}

$projectProcesses = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    (Contains-ProjectPath $_.CommandLine) -and
    ($_.CommandLine -match "server\\index\.js" -or $_.CommandLine -match "scripts\\localdock-start\.mjs")
  }
foreach ($process in $projectProcesses) {
  if ($process.CommandLine -match "server\\index\.js") {
    [void]$childPids.Add([int]$process.ProcessId)
    if ($process.ParentProcessId) {
      [void]$parentPids.Add([int]$process.ParentProcessId)
    }
  }
}

if ($childPids.Count -eq 0) {
  Write-Host "[OK] HEISS Prompt Studio is not running on port $Port."
  exit 0
}

foreach ($processId in $childPids) {
  Stop-Process -Id $processId -ErrorAction SilentlyContinue
}

Start-Sleep -Milliseconds 600
foreach ($processId in $parentPids) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
  if ($process -and $process.Name -eq "node.exe" -and $process.CommandLine -match "scripts\\localdock-start\.mjs") {
    Stop-Process -Id $processId -ErrorAction SilentlyContinue
  }
}

for ($attempt = 0; $attempt -lt 20; $attempt += 1) {
  $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  if (-not $listener) {
    Write-Host "[OK] HEISS Prompt Studio stopped."
    exit 0
  }
  Start-Sleep -Milliseconds 250
}

Write-Host "[ERROR] HEISS Prompt Studio is still listening on port $Port." -ForegroundColor Red
exit 1
