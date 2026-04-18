# digital-factory-ui

Feature & Task Status Visualization Dashboard — a Next.js app that reads
feature and task state from the management repo YAML files and renders them
as a browsable web UI.

---

## Local development

### Prerequisites

- Node.js 20+
- A local clone of the management repo (the workspace that holds `docs/features/`)

### Setup

```bash
npm install

# Copy the example env file and set your management repo path
cp .env.local.example .env.local
# Edit .env.local → set WORKSPACE_MGMT_PATH to your local management repo clone
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app reads YAML files directly from `WORKSPACE_MGMT_PATH` on every request
in this mode.

---

## Static export (GitHub Pages)

The app can be built as a fully static site and deployed to GitHub Pages.
Static builds use pre-generated JSON instead of live YAML reads.

### Build locally

```bash
# 1. Point to your management repo
export WORKSPACE_MGMT_PATH=/path/to/management-repo

# 2. Generate static JSON data
npm run generate-data

# 3. Build the static export
NEXT_PUBLIC_DATA_SOURCE=static npm run build

# Output is in out/
```

### GitHub Actions deployment

The workflow at `.github/workflows/deploy.yml` runs automatically on every
push to `main` and deploys the static export to GitHub Pages.

#### Required GitHub repository setup

1. **Enable GitHub Pages** — go to *Settings → Pages* and set the source to
   *GitHub Actions*.

2. **Management repo access** — the workflow checks out
   `tiendv89/project-workspace` alongside the implementation repo. If the
   management repo is **private**, add a Personal Access Token (PAT) or
   deploy key and uncomment the `token:` line in the workflow:

   ```yaml
   # .github/workflows/deploy.yml — in the "Checkout management repo" step:
   token: ${{ secrets.WORKSPACE_REPO_TOKEN }}
   ```

   Then add the secret in *Settings → Secrets and variables → Actions*:

   | Secret name | Value |
   |---|---|
   | `WORKSPACE_REPO_TOKEN` | A GitHub PAT with `repo` (read) scope for the management repo |

   No additional secrets are required for a public management repo.

---

## Environment variables

| Variable | Where | Description |
|---|---|---|
| `WORKSPACE_MGMT_PATH` | `.env.local` / CI env | Path to the local management repo clone. Required for local dev and the `generate-data` script. |
| `NEXT_PUBLIC_DATA_SOURCE` | CI env / build command | Set to `static` to activate static export mode (selects `StaticFeatureRepository` and enables `output: 'export'`). Omit for local dev. |

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run generate-data` | Generate `public/data/*.json` from management repo YAML (run before a static build) |
| `npm run type-check` | TypeScript type check (`tsc --noEmit`) |
| `npm run test` | Run unit tests |
| `npm run lint` | Run ESLint |

---

## Architecture

```
src/
  lib/
    types/          # TypeScript types mirroring the YAML schema
    repositories/
      feature.repository.ts              # FeatureRepository interface
      filesystem-feature.repository.ts   # Reads live YAML (local dev)
      static-feature.repository.ts       # Reads pre-generated JSON (static build)
      index.ts                           # Factory: selects impl via NEXT_PUBLIC_DATA_SOURCE
  app/
    page.tsx                  # Features list (Server Component)
    features/[id]/page.tsx    # Feature detail (Server Component)
    api/features/...          # REST API routes (local dev only; excluded from static export)
scripts/
  generate-data.ts    # Build-time YAML → JSON converter
.github/workflows/
  deploy.yml          # GitHub Actions CI/CD pipeline
```
