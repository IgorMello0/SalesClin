# ╔══════════════════════════════════════════════════════════════╗
# ║  SalesClin — Production Dockerfile (Multi-Stage)            ║
# ║  Frontend: React/Vite (Nginx) + Backend: Express/Node      ║
# ╚══════════════════════════════════════════════════════════════╝

# ═══ STAGE 1: Build Frontend ═══
FROM node:20-alpine AS frontend-build
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --ignore-scripts && npx prisma generate

COPY . .

# Variáveis embutidas no bundle do frontend (build-time)
ARG VITE_API_URL=/api
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npx vite build


# ═══ STAGE 2: Production Dependencies ═══
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Instalar apenas dependências de produção + gerar Prisma client
RUN npm ci --omit=dev --ignore-scripts && npx prisma generate

# tsx é devDependency, mas precisamos dele para rodar o server TypeScript
RUN npm install tsx


# ═══ STAGE 3: Production Runtime ═══
FROM node:20-alpine AS production
WORKDIR /app

# Instalar Nginx
RUN apk add --no-cache nginx && \
    mkdir -p /run/nginx && \
    chown -R node:node /run/nginx /var/lib/nginx /var/log/nginx

# Copiar node_modules de produção (inclui Prisma client + tsx)
COPY --from=deps /app/node_modules ./node_modules

# Copiar código do servidor
COPY server ./server
COPY api ./api
COPY prisma ./prisma
COPY package.json ./

# Copiar build do frontend
COPY --from=frontend-build /app/dist ./dist

# Copiar configs do Nginx e entrypoint
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Criar diretório de uploads com permissão
RUN mkdir -p uploads && chown -R node:node uploads

# Variáveis de runtime
ENV NODE_ENV=production
ENV PORT=4000

# O Nginx escuta na porta 80 (Traefik conecta aqui)
EXPOSE 80

# Healthcheck: verifica se o Nginx responde E se a API está viva
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1/api/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
