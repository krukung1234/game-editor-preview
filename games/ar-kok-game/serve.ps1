$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = "C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if (-not (Test-Path $python)) {
  $python = "python"
}

Set-Location $root
Write-Host "AR Mae Kok game running at http://127.0.0.1:4177/"
Write-Host "Press Ctrl+C to stop."
& $python -m http.server 4177 --bind 127.0.0.1
