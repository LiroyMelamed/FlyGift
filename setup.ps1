# ============================================================================
# FlyGift - full bootstrap (Windows / PowerShell)
#
#   1. Restores the .NET backend & installs the dotnet-ef CLI tool.
#   2. Generates a fresh Postgres-flavored EF Core migration.
#   3. Applies the migration to your Neon database.
#   4. Installs the Next.js frontend deps and runs `tsc --noEmit`.
#   5. (Optional) Installs the React Native / Expo mobile deps.
#
# Usage:
#   PowerShell -ExecutionPolicy Bypass -File .\setup.ps1
#   $env:SKIP_MOBILE = "1"; .\setup.ps1   # skip the mobile install
#   $env:SKIP_DB = "1";     .\setup.ps1   # skip dotnet ef database update
# ============================================================================
$ErrorActionPreference = "Stop"

$Root     = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend  = Join-Path $Root "FlyGiftBackend"
$Frontend = Join-Path $Root "flygift-frontend"
$Mobile   = Join-Path $Root "mobile"

function Section($msg) { Write-Host "`n[*] $msg" -ForegroundColor Cyan }
function Ok($msg)      { Write-Host "    OK  $msg" -ForegroundColor Green }
function Warn($msg)    { Write-Host "    !!  $msg" -ForegroundColor Yellow }

# --- 0. Pre-flight ----------------------------------------------------------
Section "Pre-flight checks"
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw "dotnet not found. Install .NET 9 SDK from https://dot.net"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "node not found. Install Node 20+."
}
Ok "dotnet $(dotnet --version)"
Ok "node   $(node --version)"

# --- 1. dotnet-ef tool ------------------------------------------------------
Section "Installing/updating dotnet-ef tool"
$installed = dotnet tool list -g | Select-String "dotnet-ef"
if ($installed) {
    dotnet tool update -g dotnet-ef | Out-Null
} else {
    dotnet tool install -g dotnet-ef | Out-Null
}
$env:PATH += ";$HOME\.dotnet\tools"
Ok "dotnet-ef ready"

# --- 2. Backend restore + migration ----------------------------------------
Section "Restoring backend packages"
Push-Location $Backend
dotnet restore
Pop-Location
Ok "Packages restored"

Section "Generating fresh Postgres migration (InitialPg)"
Push-Location $Backend
dotnet ef migrations add InitialPg --output-dir Migrations
Pop-Location
Ok "Migration created"

if ($env:SKIP_DB -ne "1") {
    Section "Applying migration to Neon"
    Push-Location $Backend
    dotnet ef database update
    Pop-Location
    Ok "Schema is up to date"
} else {
    Warn "SKIP_DB=1 - skipping 'dotnet ef database update'"
}

# --- 3. Frontend ------------------------------------------------------------
Section "Installing frontend deps"
Push-Location $Frontend
npm install
Pop-Location
Ok "Frontend deps installed"

Section "Type-checking frontend"
Push-Location $Frontend
npx tsc --noEmit
Pop-Location
Ok "Frontend types are clean"

# --- 4. Mobile (optional) ---------------------------------------------------
if (($env:SKIP_MOBILE -ne "1") -and (Test-Path $Mobile)) {
    Section "Installing mobile deps (Expo)"
    Push-Location $Mobile
    npm install
    Pop-Location
    Ok "Mobile deps installed"
} else {
    Warn "Skipping mobile install"
}

Section "All done!"
@"

  Next steps:
    * Edit FlyGiftBackend\appsettings.json and paste your real Neon connection string.
    * Optionally drop SendGrid + Twilio keys in the same file (otherwise both
      providers run in mock log-only mode - no emails / SMS go out).
    * Start the backend:   cd FlyGiftBackend ; dotnet run
    * Start the frontend:  cd flygift-frontend ; npm run dev
    * Start mobile (Expo): cd mobile ; npm run ios     # or  npm run android

"@ | Write-Host
