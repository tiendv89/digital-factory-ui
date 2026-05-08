# Build base
FROM node:25-alpine AS base

RUN npm install -g pnpm@10.5.2

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN apk add --no-cache git \
    && pnpm install --frozen-lockfile

# Build image
FROM node:25-alpine AS build

RUN npm install -g pnpm@10.5.2

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY . .
RUN apk add --no-cache git curl \
    && pnpm build

# Production
FROM node:25-alpine AS production

WORKDIR /app

COPY --from=build /app/next.config.ts ./

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

CMD ["node", "server.js"]
