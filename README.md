# digital-factory-ui

Next.js frontend for the Digital Factory workflow platform. Provides a workspace board (kanban + list), feature and task detail views, a task-review diff/thread view, agent chat, and channels — all backed by a single BFF (Backend-for-Frontend) that owns auth/session and proxies to the workflow-backend and user-service.

## Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/) 10.5+

## Local development

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.template .env.local
# Edit .env.local — set NEXT_PUBLIC_BFF_URL (e.g. http://localhost:8090)

# 3. Start the dev server
pnpm dev
```

The app will be available at http://localhost:3000.

## Environment variables

See `.env.template` for the full list with descriptions. Key variable:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_BFF_URL` | Yes | Base URL of the BFF (no trailing slash). The app talks **only** to the BFF, which owns auth/session (`/auth/*`) and reverse-proxies API calls under per-service prefixes (`/bff/workflow-backend`, `/bff/user-service`, `/bff/hermes-agent`). Defaults to `http://localhost:8090`. The legacy unprefixed `BFF_URL` is still accepted. |

### Build-time vs runtime config

Unlike a typical Next.js app, `NEXT_PUBLIC_*` values are **not** baked into the bundle at build time. The published image bakes nothing in: the server reads `process.env` at request time (`loadRuntimeConfig` in `src/constants/runtime-config.ts`) and passes every `NEXT_PUBLIC_*` var (prefix stripped) to the client via `RuntimeConfigProvider`. So **one image serves every deployment** — change config by passing a different env var, no rebuild required.

In local dev, `next dev` reads `NEXT_PUBLIC_*` from `.env.local` as usual.

## Available scripts

```bash
pnpm dev          # Start dev server with hot reload (Turbopack)
pnpm build        # Production build (webpack bundler)
pnpm start        # Start production server (requires build first)
pnpm lint         # Run ESLint
pnpm type-check   # Generate Next.js types then run tsc --noEmit
pnpm test         # Run unit tests (Vitest, single run)
pnpm test:watch   # Run tests in watch mode
```

## Running tests

```bash
pnpm test                                    # Run all tests
pnpm test src/__tests__/<file>.test.tsx      # Single file
```

## Docker

The image is config-agnostic — no build args or `.env` files are needed. Pass deployment config as runtime environment variables.

### Build

```bash
docker build -t digital-factory-ui .
```

### Run

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_BFF_URL=https://bff.example.com \
  digital-factory-ui
```

The container listens on port 3000 and runs the Next.js standalone server as a non-root user. Because config is read at request time, the same image can be deployed to any environment by changing the env vars passed at `docker run` time.

### Docker Compose example

```yaml
services:
  ui:
    build:
      context: .
    environment:
      NEXT_PUBLIC_BFF_URL: ${BFF_URL:-http://localhost:8090}
    ports:
      - "3000:3000"
```

## Project structure

```
src/
  app/
    (shell)/               Authenticated app shell (nav rail, topbar)
      board/               Board page (kanban + list)
      feature/[featureId]/ Feature detail page
      task/[taskId]/       Task detail page
      tasks/               Task tabs surface
      settings/            Settings pages
    login/                 Login page
    layout.tsx             Root layout (force-dynamic; loads runtime config)
    globals.css            Global styles + design tokens
  components/
    agent-chat/            Agent chat transcript + composer
    auth/                  Session context, login flow
    board/                 BoardView, FeatureCard, FeatureListView, kanban context, …
    channels/              Channels nav + views
    common/                Shared presentational primitives
    features/              Feature workbench + document panels
    orgs/                  Organization switcher / management
    settings/              Settings UI
    shell/                 Nav rail, topbar, command palette, tab bar
    tasks/                 Task review view (diff + review thread)
    workspaces/            Workspace context, switcher, import modal
  services/
    workflow-backend/      Typed API client for the workflow backend
    user-service/          Auth / user client
    hermes-agent/          Agent chat + tool-call client
    yaml-parser.ts         Workspace content (YAML) parsing
  hooks/                   Data-fetching + UI hooks (board, tasks, workspaces, …)
  stores/                  Client state (board, workspace, org-workspace)
  providers/               App providers + RuntimeConfigProvider
  constants/               Axios BFF clients, runtime-config loader
  utils/                   Shared utilities (markdown, workspaces, time, …)
  types/                   Shared TypeScript types
  __tests__/               Vitest unit tests
docs/                      QA notes and test plans
```

## Architecture notes

- The browser talks **only** to the BFF. There are no direct GitHub or backend API calls from the client.
- API clients live in `src/constants/axios.ts`: `workflowApi`, `userServiceApi`, and the hermes-agent client. Each resolves its `baseURL` fresh on every request from the BFF origin set by `RuntimeConfigProvider` (via `setBffBaseUrl`), so config changes take effect without a rebuild.
- Deployment config is read on the server per request (`loadRuntimeConfig`) and handed to the client through `RuntimeConfigProvider` — use `useRuntimeConfig()` / `useRuntimeEnv()` to read it. The root layout is `force-dynamic` so the read happens per request rather than being frozen at build.
- Authentication is owned by the BFF (`/auth/*`). The frontend relies on the session cookie set by the BFF; on 401 it redirects to `/login`. No token storage in JS.
- The app uses Next.js standalone output (`output: "standalone"`) for Docker deployments.
