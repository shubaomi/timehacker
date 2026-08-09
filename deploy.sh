#!/usr/bin/env bash

set -euo pipefail

SOURCE_DIR="/data/claude_project/timehacker"
PROD_DIR="/data/prod/timehacker"
APP_NAME="timehacker"
PORT="${PORT:-3008}"
ENV_FILE="$PROD_DIR/.env.production"
STAGING_DIR="$PROD_DIR/.standalone-next"
CURRENT_DIR="$PROD_DIR/standalone"
PREVIOUS_DIR="$PROD_DIR/.standalone-previous"

cleanup() {
  rm -rf "$STAGING_DIR"
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required."
}

rollback() {
  echo "Readiness checks failed. Restoring the previous runtime..." >&2
  pm2 logs "$APP_NAME" --lines 100 --nostream >&2 || true
  pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
  rm -rf "$CURRENT_DIR"
  if [[ -d "$PREVIOUS_DIR" ]]; then
    mv "$PREVIOUS_DIR" "$CURRENT_DIR"
    local rollback_server
    rollback_server="$(find "$CURRENT_DIR" -path "*/node_modules/*" -prune -o -name server.js -type f -print | head -n 1)"
    if [[ -n "$rollback_server" ]]; then
      HOSTNAME=127.0.0.1 PORT="$PORT" NODE_ENV=production \
        pm2 start "$rollback_server" --name "$APP_NAME" --cwd "$(dirname "$rollback_server")" --update-env --time
      pm2 save
      echo "Previous runtime restored." >&2
    fi
  fi
  exit 1
}

trap cleanup EXIT

[[ -f "$SOURCE_DIR/package.json" ]] || fail "Source project not found: $SOURCE_DIR"
[[ -f "$ENV_FILE" ]] || fail "Missing production environment file: $ENV_FILE"
[[ ! -f "$SOURCE_DIR/.env.local" ]] || fail ".env.local must not exist in the production source checkout."

for command_name in node pnpm pm2 curl find; do
  require_command "$command_name"
done

install -d -m 0755 "$PROD_DIR"

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

[[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is not set in $ENV_FILE"

echo "[1/9] Installing locked dependencies"
cd "$SOURCE_DIR"
pnpm install --frozen-lockfile

echo "[2/9] Validating deployment files"
pnpm check:deploy

echo "[3/9] Running static and unit verification"
pnpm prisma:generate
pnpm prisma:validate
pnpm lint
pnpm typecheck
NODE_ENV=test pnpm test

echo "[4/9] Building the standalone production bundle"
pnpm build

echo "[5/9] Running safe production integration tests"
NODE_ENV=test pnpm test:integration:safe

echo "[6/9] Preparing the production staging runtime"
rm -rf "$STAGING_DIR"
cp -a "$SOURCE_DIR/.next/standalone" "$STAGING_DIR"

STAGING_SERVER="$(find "$STAGING_DIR" -path "*/node_modules/*" -prune -o -name server.js -type f -print | head -n 1)"
[[ -n "$STAGING_SERVER" ]] || fail "Standalone server.js was not generated."
STAGING_SERVER_DIR="$(dirname "$STAGING_SERVER")"

install -d -m 0755 "$STAGING_SERVER_DIR/.next"
cp -a "$SOURCE_DIR/.next/static" "$STAGING_SERVER_DIR/.next/"
if [[ -d "$SOURCE_DIR/public" ]]; then
  cp -a "$SOURCE_DIR/public" "$STAGING_SERVER_DIR/"
fi

echo "[7/9] Synchronizing the catalog and activating the production runtime"
pnpm db:sync-catalog
pnpm db:check

rm -rf "$PREVIOUS_DIR"
if [[ -d "$CURRENT_DIR" ]]; then
  mv "$CURRENT_DIR" "$PREVIOUS_DIR"
fi
mv "$STAGING_DIR" "$CURRENT_DIR"

SERVER_JS="$(find "$CURRENT_DIR" -path "*/node_modules/*" -prune -o -name server.js -type f -print | head -n 1)"
[[ -n "$SERVER_JS" ]] || rollback
SERVER_DIR="$(dirname "$SERVER_JS")"

echo "[8/9] Starting PM2 on 127.0.0.1:$PORT"
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
if ! HOSTNAME=127.0.0.1 PORT="$PORT" NODE_ENV=production \
  pm2 start "$SERVER_JS" --name "$APP_NAME" --cwd "$SERVER_DIR" --update-env --time; then
  rollback
fi

echo "[9/9] Waiting for the local readiness check"
ready=0
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 3 \
    "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

[[ "$ready" -eq 1 ]] || rollback

pm2 save
rm -rf "$PREVIOUS_DIR"
trap - EXIT

echo "Deployment complete."
echo "Local runtime: http://127.0.0.1:$PORT"
echo "Public URL: https://timehacker.hihongrun.com"
echo "Nginx was not modified or reloaded by this script."
