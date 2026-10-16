$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = "C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if (-not (Test-Path $python)) {
  $python = "python"
}

Set-Location $root
Write-Host "AR game running at http://127.0.0.1:4176/"
Write-Host "Press Ctrl+C to stop."
& $python -m http.server 4176 --bind 127.0.0.1
