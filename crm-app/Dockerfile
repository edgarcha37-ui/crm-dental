# syntax=docker/dockerfile:1.6
# ==============================================================
# CRM Dental — Imagen para Dokploy (crmbeta.orbitai.pro)
# Next.js 16 standalone, Node 20-alpine, multi-stage.
# Rebuild trigger: F4 endpoints (doctors, lab-works, settings, etc.)
# ==============================================================

# --- Deps ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Las NEXT_PUBLIC_* deben estar presentes en build-time.
# Dokploy las inyecta como build args si lo configuramos así;
# por defecto se toman de .env.production copiado al contexto.
RUN npm run build

# --- Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Zona horaria de la clínica. Sin esto, alpine corre en UTC y los cálculos
# server-side de "hoy"/bordes de mes (citas, abonos, facturas, métricas)
# se desfasan un día por la tarde/noche en México (UTC-6).
RUN apk add --no-cache tzdata
ENV TZ=America/Mexico_City

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
