<#
  Deploy frontend SIMADU ke hosting (Hostinger).

  Cara pakai (dari folder D:\Simadu):
      $env:SIMADU_SSH_PASS = '<password SSH>'
      .\scripts\deploy-frontend.ps1

  Yang dilakukan:
    1. npm run build di frontend/
    2. Hapus folder static/ lama di server, upload dist/static/ yang baru (pscp -r, TANPA zip)
    3. Upload index.html + file root (favicon, sw.js, .htaccess)
#>
$ErrorActionPreference = 'Stop'

$User    = 'u927936405'
$Server  = '46.202.138.202'
$Port    = 65002
$HostKey = 'SHA256:9gaqgEW4L6kR1m5an4W+jV8oCjwo6bOkazH8GqQEaa8'
$Remote  = 'domains/bps-batanghari.com/public_html/simadu'

if (-not $env:SIMADU_SSH_PASS) { throw 'Set dulu: $env:SIMADU_SSH_PASS = "<password SSH>"' }

$Root = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $Root 'frontend\dist'

Write-Host '==> Build frontend' -ForegroundColor Cyan
Push-Location (Join-Path $Root 'frontend')
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Build gagal' }
Pop-Location

$ssh = @('-pw', $env:SIMADU_SSH_PASS, '-P', $Port, '-hostkey', $HostKey, '-batch')

Write-Host '==> Bersihkan aset lama di server' -ForegroundColor Cyan
plink @ssh "$User@$Server" "rm -rf $Remote/static && mkdir -p $Remote/static"

Write-Host '==> Upload static/' -ForegroundColor Cyan
pscp @ssh -r (Join-Path $Dist 'static\*') "$User@${Server}:$Remote/static/"

Write-Host '==> Upload index.html & file root' -ForegroundColor Cyan
foreach ($f in 'index.html', 'sw.js', 'favicon.ico', 'favicon.png', 'favicon.svg', 'icons.svg', 'logo_bps.png', '.htaccess') {
    $p = Join-Path $Dist $f
    if (Test-Path $p) { pscp @ssh $p "$User@${Server}:$Remote/$f" }
}

Write-Host '==> Selesai. Buka https://bps-batanghari.com/simadu/ lalu Ctrl+Shift+R' -ForegroundColor Green
