$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22 first.' }
$androidTestLogin = Read-Host 'Tailscale login of your own account (email/login only, NOT password)'
if ([string]::IsNullOrWhiteSpace($androidTestLogin)) { throw 'Tailscale login is required.' }
try {
    $env:AR_ANDROID_TEST_LOGIN = $androidTestLogin.Trim()
    & node (Join-Path $PSScriptRoot 'serve-android-one-game.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'The one-game server could not start. Do not start Serve until fixed.' }
} finally {
    Remove-Item Env:AR_ANDROID_TEST_LOGIN -ErrorAction SilentlyContinue
    $androidTestLogin = $null
}
