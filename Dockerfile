# ── deps ────────────────────────────────────────────────────────────────────
# Install production dependencies into a clean layer so the build stage can
# copy them without re-downloading on every source change.
FROM node:22-alpine AS deps

RUN npm install -g pnpm@10.5.2

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN apk add --no-cache git \
    && pnpm install --frozen-lockfile

# ── build ────────────────────────────────────────────────────────────────────
# Copy source and produce the standalone bundle. This image is config-agnostic:
# the BFF URL is NOT baked in here. It is injected at container startup by
# docker-entrypoint.sh (see window.__ENV__), so one image serves every
# deployment — no per-customer build args or .env files required.
FROM node:22-alpine AS build

RUN npm install -g pnpm@10.5.2

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN apk add --no-cache git curl \
    && pnpm run type-check \
    && pnpm build

# ── production ───────────────────────────────────────────────────────────────
# Minimal runtime image — only the standalone Next.js server and static assets.
FROM node:22-alpine AS production

WORKDIR /app

# standalone output + static assets + public directory
COPY --from=build /app/next.config.ts ./
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Entrypoint regenerates public/env.js from the container environment at startup.
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Pass deployment config at runtime, e.g. `docker run -e BFF_URL=https://bff.example.com`.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
