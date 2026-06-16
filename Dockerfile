# syntax=docker/dockerfile:1.7
# ── base ─────────────────────────────────────────────────────────────────────
# Shared base: enable corepack so the pnpm version is pinned by the
# `packageManager` field in package.json — no manual `npm install -g pnpm`,
# and no drift between the Dockerfile and the repo.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ── deps ─────────────────────────────────────────────────────────────────────
# Install all dependencies (incl. dev — needed to build) into a cached layer.
# Only package.json + lockfile are copied here, so this layer is reused on
# every build where dependencies haven't changed. The pnpm store is cached
# across builds via a BuildKit cache mount.
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# ── build ────────────────────────────────────────────────────────────────────
# Copy source and produce the standalone bundle. This image is config-agnostic:
# the BFF URL is NOT baked in here. It is injected at container startup by
# docker-entrypoint.sh (see window.__ENV__), so one image serves every
# deployment — no per-customer build args or .env files required.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run type-check && pnpm build

# ── production ───────────────────────────────────────────────────────────────
# Minimal runtime image — only the standalone Next.js server and static assets,
# run as a non-root user.
#
# Deployment config is NOT baked in: the server reads process.env at request time
# (see src/app/env.js/route.ts) and serves it to the browser as window.__ENV__,
# so one image serves every deployment. Pass config purely as env vars, e.g.
#   docker run -e NEXT_PUBLIC_BFF_URL=https://bff.example.com <image>
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# standalone output + static assets + public directory (owned by the runtime user)
COPY --from=build --chown=node:node /app/next.config.ts ./
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000

CMD ["node", "server.js"]
