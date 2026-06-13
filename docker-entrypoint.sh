#!/bin/sh
set -e

echo "╔══════════════════════════════════════════╗"
echo "║  SalesClin — Starting Production Server  ║"
echo "╚══════════════════════════════════════════╝"

# Rodar Prisma migrations se necessário (opcional, descomente se quiser auto-migrate)
# echo "[sellclin] Running database migrations..."
# npx prisma migrate deploy

# Iniciar o backend Node.js em background
echo "[sellclin] Starting Node.js backend on port ${PORT:-4000}..."
node --import tsx server/index.ts &
NODE_PID=$!

# Aguardar o backend ficar pronto
echo "[sellclin] Waiting for backend to initialize..."
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
