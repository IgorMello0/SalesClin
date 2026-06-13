#!/bin/sh
set -e

echo "╔══════════════════════════════════════════╗"
echo "║  SalesClin — Starting Production Server  ║"
echo "╚══════════════════════════════════════════╝"

# (Opcional) Descomentar para auto-migrate do Prisma no boot:
# echo "[sellclin] Running database migrations..."
# su-exec node npx prisma migrate deploy

# Iniciar backend Node.js como user "node" (segurança)
echo "[sellclin] Starting Node.js backend on port ${PORT:-4000}..."
su-exec node node dist-server/index.js &
NODE_PID=$!

# Aguardar o backend inicializar
sleep 3

# Verificar se o backend subiu
if ! kill -0 $NODE_PID 2>/dev/null; then
    echo "[sellclin] ❌ Backend failed to start!"
    exit 1
fi
echo "[sellclin] ✅ Backend started (PID: $NODE_PID)"

# Iniciar Nginx em foreground (PID 1 do container)
echo "[sellclin] Starting Nginx on port 80..."
echo "[sellclin] ✅ SalesClin is ready!"
exec nginx -g "daemon off;"
