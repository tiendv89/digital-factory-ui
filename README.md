# digital-factory-ui

Next.js frontend for the Digital Factory workflow management platform. Provides a workspace board, feature tabs, task tabs, and a backend-integrated view of the workflow-backend API.

## Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/) 10.5+

## Local development

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.template .env.local
# Edit .env.local — set NEXT_PUBLIC_API_BASE_URL to your local backend URL (e.g. http://localhost:8081)

# 3. Start the dev server
pnpm dev
```

The app will be available at http://localhost:3000.

## Environment variables

See `.env.template` for the full list with descriptions. Key variables:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Base URL of the workflow-backend API (no trailing slash) |
`NEXT_PUBLIC_*` variables are baked into the client bundle at build time. Set them in your deployment environment **before** running `next build` or `docker build`.

## Available scripts

```bash
pnpm dev          # Start development server with hot reload
pnpm build        # Production build (webpack bundler)
pnpm start        # Start production server (requires build first)
pnpm lint         # Run ESLint
pnpm type-check   # Generate Next.js types then run tsc --noEmit
pnpm test         # Run unit tests (Vitest)
pnpm test:watch   # Run tests in watch mode
```

## Running tests

```bash
pnpm test                                              # Run all tests
pnpm test src/__tests__/feature-tab-view.test.ts       # Single file
```

## Docker

### Build

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
  -t digital-factory-ui .
```

### Run

```bash
docker run -p 3000:3000 digital-factory-ui
```

The container listens on port 3000. The `NEXT_PUBLIC_API_BASE_URL` value is baked into the bundle at build time, so it must be provided as a build argument — not a runtime environment variable.

### Docker Compose example

```yaml
services:
  ui:
    build:
      context: .
      args:
        NEXT_PUBLIC_API_BASE_URL: ${API_URL:-http://localhost:8081}
    ports:
      - "3000:3000"
```

## Project structure

```
src/
  app/                     Next.js App Router pages and API routes
    api/content/fetch/     Server-side content proxy route
    board/                 Board page
    connect/               Workspace connect page
    feature/[sessionId]/   Feature detail page
    task/[sessionId]/      Task detail page
  features/
    board/                 Kanban board, feature list, task list
      components/          BoardHeader, FeatureBoardView, FeatureDetailSheet,
                           FeatureTabView, KanbanBoard, TaskBoardView, TaskCard,
                           TaskTrackingPanel, and more
      hooks/               Data-fetching hooks (useFeatureDetail, useBoardData, …)
    tasks/                 Task detail tab and drawer
    workspaces/            Workspace context, switcher, import modal, tab bar
  services/
    workflow-backend/      Typed API client for the backend
    content-provider/      Fetches and parses workspace content (YAML, GitHub, …)
    local-workspace-store  Browser-local workspace summary persistence
    workspace-store        Active workspace state
  lib/                     Shared utilities (markdown, click-intent, request-sequence, time)
  types/                   Shared TypeScript types (workspace, …)
docs/                      QA notes and test plans
```

## Architecture notes

- All workspace data is fetched from `workflow-backend` — no direct GitHub API calls from the browser.
- `NEXT_PUBLIC_API_BASE_URL` is read once at startup via `getApiBase()` in `src/services/workflow-backend/client.ts`; if unset the app throws immediately rather than silently failing later.
- The app uses Next.js standalone output (`output: "standalone"`) for Docker deployments.
