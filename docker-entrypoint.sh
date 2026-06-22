#!/bin/sh
set -e

echo "=============================================="
echo "  SalesClin - Starting Production Server"
echo "=============================================="

# Sync Prisma schema before the backend bootstrap runs.
# The VPS deployment uses db push, so new tables must exist before startup seeds.
if [ "${RUN_PRISMA_DB_PUSH:-true}" = "true" ]; then
    echo "[sellclin] Syncing database schema with Prisma..."
    npx --yes prisma@6.18.0 db push --skip-generate
fi

echo "[sellclin] Starting Node.js backend on port ${PORT:-4000}..."
su-exec node node dist-server/index.js &
NODE_PID=$!

sleep 3

if ! kill -0 $NODE_PID 2>/dev/null; then
    echo "[sellclin] Backend failed to start!"
    exit 1
fi
echo "[sellclin] Backend started (PID: $NODE_PID)"

echo "[sellclin] Starting Nginx on port 80..."
echo "[sellclin] SalesClin is ready!"
exec nginx -g "daemon off;"
