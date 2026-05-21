# QA Notes — Workspace Tabs Data Flow (T7)

## Verification summary

All subtasks verified via automated unit tests in `src/__tests__/t7-end-to-end-qa.test.ts` (15 test sections, 60+ assertions).

## Surface-by-surface verification

### Workspace list, switcher, import, and sync flows

| Surface | Status | Notes |
| --- | --- | --- |
| Browser-local workspace summary lifecycle | ✅ Pass | Sections 1–3: empty on load, upsert deduplication, profile isolation, malformed-JSON resilience |
| Bootstrap workspace ID selection | ✅ Pass | Section 2: stored-ID preference, MRO fallback, array immutability |
| Selected workspace ID persistence | ✅ Pass | Section 3: set / replace / clear cycle |
| Import flow (buildImportLocalSummary) | ✅ Pass | Section 4: name priority, repo basename fallback, `.git` strip, default_branch default |
| Import error code → UI mapping | ✅ Pass | Section 9: all 6 error codes via `getImportErrorMessage` from `importError.ts` |
| Board data sourced from WorkspaceDetail | ✅ Pass | Section 13: board features/tasks come from WorkspaceDetail, not local storage |

### Task and feature click / double-click / context menu / tab flows

| Surface | Status | Notes |
| --- | --- | --- |
| Tab management (task tabs) | ✅ Pass | Section 12: `addTaskTab` / `removeTaskTab` from `tabState.ts` — dedup, add, remove |
| Tab management (feature tabs) | ✅ Pass | Section 12: `addFeatureTab` / `removeFeatureTab` from `tabState.ts` — dedup, add, remove |
| Tab keying by UUID (task) | ✅ Pass | Section 12: taskId UUID, not task_name |
| Tab keying by UUID (feature) | ✅ Pass | Section 12: featureId UUID, not feature_name |
| Identifier contract | ✅ Pass | Section 14: id = UUID, task_name/feature_name = display label; board uses task_name as ParsedTask.id |

### Sidebar active-task query

| Surface | Status | Notes |
| --- | --- | --- |
| SIDEBAR_TASK_PARAMS independence | ✅ Pass | Section 5: statuses, sort, limit=50, no task search fields |
| Sidebar result independent from workspace detail | ✅ Pass | Section 7: adaptTaskSummariesToFeatures operates on its own payload |
| adaptTaskSummariesToFeatures | ✅ Pass | Section 7: groups by feature_id UUID, maps task_name→id, blocked flag |

### Stale-source, retryable-error, loading, and empty-state

| Surface | Status | Notes |
| --- | --- | --- |
| source_state.stale=false (normal) | ✅ Pass | Section 10 |
| source_state.stale=true — board stays visible | ✅ Pass | Section 10: features not wiped on stale |
| retryable=true/false | ✅ Pass | Section 10: retryable flag propagated correctly |
| Empty features / tasks arrays | ✅ Pass | Section 10: renders empty state, not error |

### No direct GitHub reads

| Surface | Status | Notes |
| --- | --- | --- |
| local-workspace-store | ✅ Pass | Section 11: no github import |
| WorkspaceContext | ✅ Pass | Section 11: no api.github.com reference |
| workflow-backend client | ✅ Pass | Section 11: no github.com/repos reference |
| ImportModal | ✅ Pass | Section 11: no direct GitHub API calls |
| board page | ✅ Pass | Section 11: no direct GitHub API calls |

### No activity timeline, agent/chat controls, model selector

| Surface | Status | Notes |
| --- | --- | --- |
| workflow-backend exports | ✅ Pass | Section 15: no getActivity / fetchActivity exports |

## Query param contract

| Param | Status | Notes |
| --- | --- | --- |
| Feature title search (`title`) | ✅ Pass | Section 8 |
| Task name search (`task_id`) | ✅ Pass | Section 8 |
| Status filter (comma-separated) | ✅ Pass | Section 8 |
| Sort params | ✅ Pass | Section 8 |
| Undefined fields omitted | ✅ Pass | Section 8 |

## Build & typecheck

| Check | Result |
| --- | --- |
| `pnpm run type-check` | ✅ Pass |
| `pnpm test src/__tests__/t7-end-to-end-qa.test.ts` | ✅ Pass (all sections) |

## Regression coverage

- No direct GitHub workspace-data network calls from browser workspace flows.
- No agent, chat, model selector, composer, or conversation controls in workspace/board surfaces.
- Board data always sourced from WorkspaceDetail (API response), never from local storage summaries.
- Sidebar query is independent from workspace-detail and task-mode payloads.
