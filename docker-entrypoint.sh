#!/bin/sh
set -e

echo "=============================================="
echo "  SalesClin - Starting Production Server"
echo "=============================================="

# The bind mount hides image-time ownership. Ensure the backend can persist public media.
mkdir -p /app/uploads/media
chown -R node:node /app/uploads
chmod 750 /app/uploads

# Sync Prisma schema before the backend bootstrap runs.
# The VPS deployment uses db push, so new tables must exist before startup seeds.
if [ "${RUN_PRISMA_DB_PUSH:-false}" = "true" ]; then
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
nginx -g "daemon off;" &
NGINX_PID=$!

shutdown() {
    kill "$NODE_PID" "$NGINX_PID" 2>/dev/null || true
    wait "$NODE_PID" "$NGINX_PID" 2>/dev/null || true
}

trap shutdown INT TERM EXIT

# Mantem o container ativo somente enquanto frontend e backend estiverem vivos.
# Se um deles cair, o container encerra com erro e o Docker Swarm o recria.
while kill -0 "$NODE_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
    sleep 5
done

if ! kill -0 "$NODE_PID" 2>/dev/null; then
    echo "[sellclin] Backend stopped unexpectedly. Restarting container..."
else
    echo "[sellclin] Nginx stopped unexpectedly. Restarting container..."
fi

exit 1
