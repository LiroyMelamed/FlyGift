#!/usr/bin/env bash
# ============================================================================
# FlyGift — full bootstrap (macOS / Linux)
#
#   1. Restores the .NET backend & installs the dotnet-ef CLI tool.
#   2. Generates a fresh Postgres-flavored EF Core migration.
#   3. Applies the migration to your Neon database.
#   4. Installs the Next.js frontend deps and runs `tsc --noEmit`.
#   5. (Optional) Installs the React Native / Expo mobile deps.
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh                # full bootstrap
#   SKIP_MOBILE=1 ./setup.sh  # skip the mobile install
#   SKIP_DB=1 ./setup.sh      # skip dotnet ef database update
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/FlyGiftBackend"
FRONTEND="$ROOT/flygift-frontend"
MOBILE="$ROOT/mobile"

bold() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "  \033[1;32m✓\033[0m %s\n" "$*"; }
warn() { printf "  \033[1;33m!\033[0m %s\n" "$*"; }

# --- 0. Pre-flight ----------------------------------------------------------
bold "Pre-flight checks"
command -v dotnet >/dev/null || { echo "✗ .NET 9 SDK not found. Install from https://dot.net"; exit 1; }
command -v node   >/dev/null || { echo "✗ Node.js not found. Install Node 20+."; exit 1; }
ok "dotnet $(dotnet --version)"
ok "node   $(node --version)"

# --- 1. dotnet-ef tool ------------------------------------------------------
bold "Installing/updating dotnet-ef tool"
if dotnet tool list -g | grep -q "dotnet-ef"; then
  dotnet tool update -g dotnet-ef >/dev/null
else
  dotnet tool install -g dotnet-ef >/dev/null
fi
export PATH="$PATH:$HOME/.dotnet/tools"
ok "dotnet-ef ready"

# --- 2. Backend restore + migration ----------------------------------------
bold "Restoring backend packages"
( cd "$BACKEND" && dotnet restore )
ok "Packages restored"

bold "Generating fresh Postgres migration (InitialPg)"
( cd "$BACKEND" && dotnet ef migrations add InitialPg --output-dir Migrations )
ok "Migration created"

if [[ "${SKIP_DB:-0}" != "1" ]]; then
  bold "Applying migration to Neon"
  ( cd "$BACKEND" && dotnet ef database update )
  ok "Schema is up to date"
else
  warn "SKIP_DB=1 — skipping 'dotnet ef database update'"
fi

# --- 3. Frontend ------------------------------------------------------------
bold "Installing frontend deps"
( cd "$FRONTEND" && npm install )
ok "Frontend deps installed"

bold "Type-checking frontend"
( cd "$FRONTEND" && npx tsc --noEmit )
ok "Frontend types are clean"

# --- 4. Mobile (optional) ---------------------------------------------------
if [[ "${SKIP_MOBILE:-0}" != "1" && -d "$MOBILE" ]]; then
  bold "Installing mobile deps (Expo)"
  ( cd "$MOBILE" && npm install )
  ok "Mobile deps installed"
else
  warn "Skipping mobile install"
fi

bold "All done!"
cat <<EOF

  Next steps:
    • Edit FlyGiftBackend/appsettings.json and paste your real Neon connection string.
    • Optionally drop SendGrid + Twilio keys in the same file (otherwise both providers
      run in mock log-only mode — no emails / SMS go out).
    • Start the backend:   cd FlyGiftBackend && dotnet run
    • Start the frontend:  cd flygift-frontend && npm run dev
    • Start mobile (Expo): cd mobile && npm run ios   # or  npm run android

EOF
