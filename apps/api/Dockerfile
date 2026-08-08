# ============================================================
# opensis API — Dockerfile multi-stage (NestJS + Prisma + BullMQ)
#
# Build stage memakai alpine + build tools (python3/make/g++ dibutuhkan
# kompilasi native argon2; openssl + libc6-compat untuk Prisma engine).
# Runtime stage alpine ringan, USER node, Tini sebagai init (zombie reap).
#
# CATATAN ALIAS @opensis/*: tsconfig.base.json memetakan @opensis/database &
# @opensis/types ke source .ts. nest build (rootDir ../..) meng-kompilasi
# source package tersebut ke apps/api/dist/packages/*, TAPI tsc-alias menulis
# path require yang rusak (resolve ke apps/api/dist -> MODULE_NOT_FOUND).
# apps/api/docker/fix-dist-requires.cjs memperbaikinya secara deterministik
# setelah build; CMD memakai hasil verifikasi build nyata:
#   node apps/api/dist/apps/api/src/main.js
# ============================================================

# ---------- STAGE 1: BUILD ----------
FROM node:22-alpine AS build

# Build tools: libc6-compat + openssl (Prisma engine), python3 make g++ (argon2 native)
RUN apk add --no-cache libc6-compat openssl python3 make g++

WORKDIR /app

# Manifes workspace dulu agar layer npm ci di-cache
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/ui/package.json ./packages/ui/package.json

# Lockfile workspace -> npm ci wajib ada semua workspace package.json
RUN npm ci --no-audit --no-fund

# Seluruh source (build context sudah difilter .dockerignore)
COPY . .

# Prisma generate butuh DATABASE_URL walau hanya placeholder (tidak konek DB)
ENV NODE_ENV=production \
    DATABASE_URL="postgresql://postgres:postgres@postgres:5432/opensis?schema=public"

# Build API + dependensi workspace (@opensis/types tsc, @opensis/database prisma generate)
RUN npx turbo run build --filter=@opensis/api

# Perbaiki path require @opensis/* di dist (lihat komentar header)
RUN node apps/api/docker/fix-dist-requires.cjs

# Runtime hanya butuh production deps (argon2 .node dll) — buang dev
RUN npm prune --omit=dev --no-audit --no-fund

# ---------- STAGE 2: RUNTIME ----------
FROM node:22-alpine AS runtime

RUN apk add --no-cache libc6-compat openssl tini

ENV NODE_ENV=production \
    PORT=3001

WORKDIR /app

# Storage lokal upload (di-mount volume opensis-storage dari compose)
RUN mkdir -p /app/storage && chown -R node:node /app/storage

USER node

# node_modules production + dist hasil build + package.json (workspace)
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/packages ./packages

EXPOSE 3001

# Healthcheck: endpoint publik /api/v1/health (global prefix GLOBAL_PREFIX)
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -q -O - http://127.0.0.1:3001/api/v1/health >/dev/null 2>&1 || exit 1

# Tini sebagai PID 1 (signal handling + reap zombie) lalu jalankan hasil build
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
