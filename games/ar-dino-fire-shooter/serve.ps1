$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$python = "C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$port = if ($env:PORT) { [int]$env:PORT } else { 4191 }

Write-Host "AR Dino Fire Shooter: http://127.0.0.1:$port/"
& $python -m http.server $port --bind 127.0.0.1
