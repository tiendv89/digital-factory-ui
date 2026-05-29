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
# Copy source, inject build-time env vars, and produce the standalone bundle.
# NEXT_PUBLIC_* variables must be provided here so Next.js can bake them into
# the client bundle.  Pass them with --build-arg or via an .env.production file
# that your CI pipeline writes before invoking docker build.
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

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
