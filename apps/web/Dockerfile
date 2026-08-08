# ============================================================
# opensis Web — Dockerfile multi-stage (Next.js 16 standalone)
#
# next.config.ts memakai output: "standalone" + outputFileTracingRoot
# (root monorepo). Verifikasi build nyata: server standalone berada di
#   apps/web/.next/standalone/apps/web/server.js
# dan aset statis di apps/web/.next/static (DI LUAR standalone), sehingga
# stage runtime menyalin keduanya:
#   COPY .../.next/standalone ./
#   COPY .../.next/static   ./apps/web/.next/static
# CMD: node apps/web/server.js (PORT/HOSTNAME dari env compose).
# ============================================================

# ---------- STAGE 1: BUILD ----------
FROM node:22-alpine AS build

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Manifes workspace dulu agar layer npm ci di-cache
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN npm ci --no-audit --no-fund

COPY . .

# NEXT_PUBLIC_* dibaca saat build (client bundle). Default kosong -> web
# memakai API same-origin relatif (/api/v1) lewat Nginx.
ARG NEXT_PUBLIC_API_BASE=""
ARG NEXT_PUBLIC_APP_NAME="opensis"
ARG NEXT_PUBLIC_DEMO="0"
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_DEMO=$NEXT_PUBLIC_DEMO \
    NODE_ENV=production

RUN npx turbo run build --filter=@opensis/web

# ---------- STAGE 2: RUNTIME ----------
FROM node:22-alpine AS runtime

RUN apk add --no-cache libc6-compat tini

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

USER node

# Server standalone + minimal node_modules (hasil outputFileTracingRoot)
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
# Aset statis (di luar standalone) diletakkan sesuai path yang diekspektasi server
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -q -O - http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
