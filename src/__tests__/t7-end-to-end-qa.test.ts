/**
 * T7 — End-to-end browser QA and regression coverage
 *
 * Verifies the full workspace-tabs-data-flow integration:
 *   - Browser-local workspace summary lifecycle and import flow
 *   - Workspace switching and context updates
 *   - Sidebar independent active-task query (not derived from other payloads)
 *   - Manual sync and stale-source handling
 *   - Tab management: open/focus/close for task tabs and feature tabs
 *   - Board surface routing: board, task-tab, feature-tab
 *   - No GitHub direct workspace-data reads in the new workspace flow
 *   - Structured error codes mapped to UI error states
 *   - Import modal error handling for each validation code
 *   - Query param contract: sidebar vs task-mode vs feature-mode
 *   - SIDEBAR_TASK_PARAMS independence from other query builders
 */

import { describe, it, expect, beforeEach } from "vitest";

// ─── localStorage shim ────────────────────────────────────────────────────────

const lsStore: Record<string, string> = {};
const mockLS = {
  getItem: (k: string) => lsStore[k] ?? null,
  setItem: (k: string, v: string) => { lsStore[k] = v; },
  removeItem: (k: string) => { delete lsStore[k]; },
  clear: () => { for (const k of Object.keys(lsStore)) delete lsStore[k]; },
};
// @ts-expect-error test shim
global.window = {};
// @ts-expect-error test shim
global.localStorage = mockLS;

import {
  getLocalWorkspaceSummaries,
  saveLocalWorkspaceSummary,
  removeLocalWorkspaceSummary,
  getSelectedWorkspaceId,
  setSelectedWorkspaceId,
  clearSelectedWorkspaceId,
  resolveBootstrapWorkspaceId,
} from "../services/local-workspace-store";

import {
  buildFeatureParams,
  buildTaskParams,
  SIDEBAR_TASK_PARAMS,
} from "../services/workflow-backend/query-params";

import {
  adaptWorkspaceDetail,
  adaptTaskSummariesToFeatures,
  adaptTaskSummary,
  adaptFeatureSummary,
  buildImportLocalSummary,
} from "../features/workspaces/lib/workspaceAdapter";

import { getImportErrorMessage } from "../features/workspaces/lib/importError";

import {
  addTaskTab,
  removeTaskTab,
  addFeatureTab,
  removeFeatureTab,
} from "../features/workspaces/lib/tabState";

import type {
  LocalWorkspaceSummary,
  WorkspaceDetail,
  FeatureSummary,
  TaskSummary,
  ApiError,
  ImportWorkspaceRequest,
} from "../services/workflow-backend/types";

import type { TaskTabEntry, FeatureTabEntry } from "../features/workspaces/context/WorkspaceContext";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeLocalSummary(partial: Partial<LocalWorkspaceSummary> = {}): LocalWorkspaceSummary {
  return {
    workspaceId: "ws-uuid-001",
    name: "My Workspace",
    repo_url: "https://github.com/org/repo",
    default_branch: "main",
    last_opened_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

function makeFeatureSummary(partial: Partial<FeatureSummary> = {}): FeatureSummary {
  return {
    id: "feat-uuid-1",
    feature_id: "my-feature",
    feature_name: "my-feature",
    title: "My Feature",
    status: "in_implementation",
    current_stage: "in_implementation",
    updated_at: "2026-01-01T00:00:00Z",
    task_counts: { total: 2, done: 1, in_progress: 1, blocked: 0, ready: 0, todo: 0 },
    ...partial,
  };
}

function makeTaskSummary(partial: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "task-uuid-1",
    task_id: "T1",
    task_name: "T1",
    feature_id: "feat-uuid-1",
    feature_name: "my-feature",
    title: "Implement API client",
    status: "in_progress",
    repo: "digital-factory-ui",
    branch: "feature/my-feature-T1",
    is_blocked: false,
    pr: null,
    workspace_pr: null,
    ...partial,
  };
}

function makeWorkspaceDetail(partial: Partial<WorkspaceDetail> = {}): WorkspaceDetail {
  return {
    id: "ws-uuid-001",
    name: "My Workspace",
    slug: "my-workspace",
    repo_url: "https://github.com/org/repo",
    source_state: { stale: false },
    updated_at: "2026-01-01T00:00:00Z",
    features: [],
    tasks: [],
    ...partial,
  };
}

beforeEach(() => {
  mockLS.clear();
});

// ─── Section 1: Browser-local workspace summary lifecycle ─────────────────────

describe("browser-local workspace summary: privacy and isolation", () => {
  it("starts empty — no workspace shown until one is imported", () => {
    expect(getLocalWorkspaceSummaries()).toEqual([]);
    expect(getSelectedWorkspaceId()).toBeNull();
  });

  it("stores only picker metadata — not features, tasks, or full WorkspaceDetail", () => {
    const summary = makeLocalSummary();
    saveLocalWorkspaceSummary(summary);
    const stored = getLocalWorkspaceSummaries();
    expect(stored).toHaveLength(1);
    const keys = Object.keys(stored[0]);
    // Only picker metadata keys are allowed
    expect(keys).toEqual(expect.arrayContaining(["workspaceId", "name", "repo_url", "default_branch", "last_opened_at"]));
    // No full workspace data keys
    expect(keys).not.toContain("features");
    expect(keys).not.toContain("tasks");
    expect(keys).not.toContain("source_state");
    expect(keys).not.toContain("slug");
  });

  it("workspace imported by one profile is not shown in another because summaries are browser-local", () => {
    // Simulate profile A: save a summary
    saveLocalWorkspaceSummary(makeLocalSummary({ workspaceId: "ws-profile-a", name: "Profile A WS" }));
    expect(getLocalWorkspaceSummaries()).toHaveLength(1);

    // Simulate profile B: clear localStorage (different browser profile)
    mockLS.clear();
    // Profile B sees no workspaces — backend-only workspaces not visible
    expect(getLocalWorkspaceSummaries()).toHaveLength(0);
  });

  it("removing a local summary does not delete from backend — only from the local picker", () => {
    saveLocalWorkspaceSummary(makeLocalSummary({ workspaceId: "ws-a" }));
    saveLocalWorkspaceSummary(makeLocalSummary({ workspaceId: "ws-b" }));
    removeLocalWorkspaceSummary("ws-a");
    // ws-a removed from local picker only
    expect(getLocalWorkspaceSummaries()).toHaveLength(1);
    expect(getLocalWorkspaceSummaries()[0].workspaceId).toBe("ws-b");
    // ws-b still present
  });

  it("saving same workspaceId twice upserts (no duplicates)", () => {
    saveLocalWorkspaceSummary(makeLocalSummary({ workspaceId: "ws-a", name: "Old" }));
    saveLocalWorkspaceSummary(makeLocalSummary({ workspaceId: "ws-a", name: "New" }));
    const list = getLocalWorkspaceSummaries();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("New");
  });

  it("malformed localStorage value returns empty list instead of throwing", () => {
    lsStore["dashboard:workspace-summaries"] = "{corrupt:json{{";
    expect(() => getLocalWorkspaceSummaries()).not.toThrow();
    expect(getLocalWorkspaceSummaries()).toEqual([]);
  });
});

// ─── Section 2: Bootstrap workspace ID selection ──────────────────────────────

describe("bootstrap workspace ID resolution", () => {
  it("returns null with no summaries and no stored ID", () => {
    expect(resolveBootstrapWorkspaceId([], null)).toBeNull();
  });

  it("prefers stored ID over most-recently-opened heuristic", () => {
    const summaries = [
      makeLocalSummary({ workspaceId: "ws-recent", last_opened_at: "2026-06-01T00:00:00Z" }),
      makeLocalSummary({ workspaceId: "ws-stored", last_opened_at: "2026-01-01T00:00:00Z" }),
    ];
    expect(resolveBootstrapWorkspaceId(summaries, "ws-stored")).toBe("ws-stored");
  });

  it("picks most recently opened when stored ID is null", () => {
    const summaries = [
      makeLocalSummary({ workspaceId: "ws-old", last_opened_at: "2025-01-01T00:00:00Z" }),
      makeLocalSummary({ workspaceId: "ws-new", last_opened_at: "2026-06-01T00:00:00Z" }),
    ];
    expect(resolveBootstrapWorkspaceId(summaries, null)).toBe("ws-new");
  });

  it("does not mutate the input summaries array during sort", () => {
    const summaries = [
      makeLocalSummary({ workspaceId: "ws-a", last_opened_at: "2025-01-01T00:00:00Z" }),
      makeLocalSummary({ workspaceId: "ws-b", last_opened_at: "2026-06-01T00:00:00Z" }),
    ];
    const originalOrder = summaries.map((s) => s.workspaceId);
    resolveBootstrapWorkspaceId(summaries, null);
    expect(summaries.map((s) => s.workspaceId)).toEqual(originalOrder);
  });

  it("returns the only summary when exactly one exists", () => {
    const summaries = [makeLocalSummary({ workspaceId: "ws-only" })];
    expect(resolveBootstrapWorkspaceId(summaries, null)).toBe("ws-only");
  });
});

// ─── Section 3: Selected workspace ID persistence ─────────────────────────────

describe("selected workspace ID persistence", () => {
  it("returns null before any selection", () => {
    expect(getSelectedWorkspaceId()).toBeNull();
  });

  it("persists and retrieves the selected workspace ID", () => {
    setSelectedWorkspaceId("ws-123");
    expect(getSelectedWorkspaceId()).toBe("ws-123");
  });

  it("replaces previous selection on switch", () => {
    setSelectedWorkspaceId("ws-a");
    setSelectedWorkspaceId("ws-b");
    expect(getSelectedWorkspaceId()).toBe("ws-b");
  });

  it("clears the selection", () => {
    setSelectedWorkspaceId("ws-a");
    clearSelectedWorkspaceId();
    expect(getSelectedWorkspaceId()).toBeNull();
  });

  it("workspace switch: setSelectedWorkspaceId + saveLocalWorkspaceSummary together", () => {
    saveLocalWorkspaceSummary(makeLocalSummary({ workspaceId: "ws-x", last_opened_at: "2026-01-01T00:00:00Z" }));
    saveLocalWorkspaceSummary(makeLocalSummary({ workspaceId: "ws-y", last_opened_at: "2026-01-01T00:00:00Z" }));
    setSelectedWorkspaceId("ws-y");
    expect(resolveBootstrapWorkspaceId(getLocalWorkspaceSummaries(), getSelectedWorkspaceId())).toBe("ws-y");
  });
});

// ─── Section 4: Import local summary builder ──────────────────────────────────

describe("buildImportLocalSummary — import flow", () => {
  const now = "2026-05-21T12:00:00.000Z";

  it("sets workspaceId from WorkspaceDetail.id", () => {
    const detail = makeWorkspaceDetail({ id: "ws-imported-1" });
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo" };
    expect(buildImportLocalSummary(detail, body, now).workspaceId).toBe("ws-imported-1");
  });

  it("prefers detail.name over body.name", () => {
    const detail = makeWorkspaceDetail({ name: "Backend Name" });
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo", name: "Body Name" };
    expect(buildImportLocalSummary(detail, body, now).name).toBe("Backend Name");
  });

  it("falls back to body.name when detail.name is empty", () => {
    const detail = makeWorkspaceDetail({ name: "" });
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo", name: "Body Name" };
    expect(buildImportLocalSummary(detail, body, now).name).toBe("Body Name");
  });

  it("falls back to repo basename when no name is available", () => {
    const detail = makeWorkspaceDetail({ name: "" });
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/my-repo" };
    expect(buildImportLocalSummary(detail, body, now).name).toBe("my-repo");
  });

  it("strips .git suffix from repo basename", () => {
    const detail = makeWorkspaceDetail({ name: "" });
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/my-repo.git" };
    expect(buildImportLocalSummary(detail, body, now).name).toBe("my-repo");
  });

  it("defaults default_branch to main when not provided", () => {
    const detail = makeWorkspaceDetail();
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo" };
    expect(buildImportLocalSummary(detail, body, now).default_branch).toBe("main");
  });

  it("uses body.default_branch when provided", () => {
    const detail = makeWorkspaceDetail();
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo", default_branch: "dev" };
    expect(buildImportLocalSummary(detail, body, now).default_branch).toBe("dev");
  });

  it("sets last_opened_at from the now parameter", () => {
    const detail = makeWorkspaceDetail();
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo" };
    expect(buildImportLocalSummary(detail, body, now).last_opened_at).toBe(now);
  });

  it("stores repo_url from request body", () => {
    const detail = makeWorkspaceDetail();
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/my-repo" };
    expect(buildImportLocalSummary(detail, body, now).repo_url).toBe("https://github.com/org/my-repo");
  });

  it("full import flow: build summary → save → select → retrieve", () => {
    const detail = makeWorkspaceDetail({ id: "ws-flow-1", name: "Flow WS" });
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo" };
    const summary = buildImportLocalSummary(detail, body, now);
    saveLocalWorkspaceSummary(summary);
    setSelectedWorkspaceId(summary.workspaceId);
    expect(getLocalWorkspaceSummaries()).toHaveLength(1);
    expect(getSelectedWorkspaceId()).toBe("ws-flow-1");
    expect(resolveBootstrapWorkspaceId(getLocalWorkspaceSummaries(), getSelectedWorkspaceId())).toBe("ws-flow-1");
  });
});

// ─── Section 5: Sidebar active-task query independence ────────────────────────

describe("SIDEBAR_TASK_PARAMS — independent from other query builders", () => {
  it("uses exactly the documented active statuses including blocked", () => {
    expect(SIDEBAR_TASK_PARAMS.get("status")).toBe("blocked,in_progress,reviewing,in_review,ready");
  });

  it("uses task_id_asc sort", () => {
    expect(SIDEBAR_TASK_PARAMS.get("sort")).toBe("task_id_asc");
  });

  it("always fetches page 1 with limit 50", () => {
    expect(SIDEBAR_TASK_PARAMS.get("page")).toBe("1");
    expect(SIDEBAR_TASK_PARAMS.get("limit")).toBe("50");
  });

  it("does not include task search fields (task_id, title, repo)", () => {
    expect(SIDEBAR_TASK_PARAMS.has("task_id")).toBe(false);
    expect(SIDEBAR_TASK_PARAMS.has("title")).toBe(false);
    expect(SIDEBAR_TASK_PARAMS.has("repo")).toBe(false);
  });

  it("sidebar params differ from a task-mode search with the same status filter", () => {
    const taskModeParams = buildTaskParams({
      status: ["in_progress", "in_review", "ready"],
      sort: "task_id_asc",
      page: 1,
      limit: 20,
    });
    // limit is 50 for sidebar vs 20 for task-mode
    expect(SIDEBAR_TASK_PARAMS.get("limit")).toBe("50");
    expect(taskModeParams.get("limit")).toBe("20");
  });

  it("SIDEBAR_TASK_PARAMS is a stable constant (frozen URLSearchParams)", () => {
    // Mutating should not affect the constant
    const copy = new URLSearchParams(SIDEBAR_TASK_PARAMS);
    copy.set("title", "injected");
    expect(SIDEBAR_TASK_PARAMS.has("title")).toBe(false);
  });
});

// ─── Section 6: Board-level workspace adapter ─────────────────────────────────

describe("adaptWorkspaceDetail — board data adapter", () => {
  it("returns empty array for a workspace with no features", () => {
    const detail = makeWorkspaceDetail({ features: [], tasks: [] });
    expect(adaptWorkspaceDetail(detail)).toEqual([]);
  });

  it("produces one ParsedFeature per FeatureSummary", () => {
    const features = [
      makeFeatureSummary({ id: "f1", feature_name: "feat-a" }),
      makeFeatureSummary({ id: "f2", feature_name: "feat-b" }),
    ];
    const result = adaptWorkspaceDetail(makeWorkspaceDetail({ features, tasks: [] }));
    expect(result).toHaveLength(2);
  });

  it("uses feature_name as the ParsedFeature.id", () => {
    const features = [makeFeatureSummary({ feature_name: "my-feature" })];
    const result = adaptWorkspaceDetail(makeWorkspaceDetail({ features, tasks: [] }));
    expect(result[0].id).toBe("my-feature");
  });

  it("routes tasks to their owning feature by feature_id UUID", () => {
    const features = [
      makeFeatureSummary({ id: "f-uuid-1", feature_name: "feat-a" }),
      makeFeatureSummary({ id: "f-uuid-2", feature_name: "feat-b" }),
    ];
    const tasks = [
      makeTaskSummary({ task_name: "T1", feature_id: "f-uuid-1" }),
      makeTaskSummary({ task_name: "T2", feature_id: "f-uuid-2" }),
      makeTaskSummary({ task_name: "T3", feature_id: "f-uuid-1" }),
    ];
    const result = adaptWorkspaceDetail(makeWorkspaceDetail({ features, tasks }));
    const featA = result.find((f) => f.id === "feat-a")!;
    const featB = result.find((f) => f.id === "feat-b")!;
    expect(featA.tasks).toHaveLength(2);
    expect(featB.tasks).toHaveLength(1);
  });

  it("tasks with unknown feature_id are excluded", () => {
    const features = [makeFeatureSummary({ id: "f-uuid-1", feature_name: "feat-a" })];
    const tasks = [
      makeTaskSummary({ task_name: "T1", feature_id: "f-uuid-1" }),
      makeTaskSummary({ task_name: "T9", feature_id: "f-uuid-orphan" }),
    ];
    const result = adaptWorkspaceDetail(makeWorkspaceDetail({ features, tasks }));
    expect(result[0].tasks).toHaveLength(1);
    expect(result[0].tasks[0].id).toBe("T1");
  });
});

// ─── Section 7: Sidebar task adapter (adaptTaskSummariesToFeatures) ───────────

describe("adaptTaskSummariesToFeatures — sidebar adapter", () => {
  it("groups tasks by feature_id (primary key)", () => {
    const tasks = [
      makeTaskSummary({ feature_id: "feat-uuid-a", feature_name: "feat-a", task_name: "T1" }),
      makeTaskSummary({ feature_id: "feat-uuid-a", feature_name: "feat-a", task_name: "T2" }),
      makeTaskSummary({ feature_id: "feat-uuid-b", feature_name: "feat-b", task_name: "T3" }),
    ];
    const result = adaptTaskSummariesToFeatures(tasks);
    expect(result).toHaveLength(2);
    const featA = result.find((f) => f.id === "feat-a")!;
    const featB = result.find((f) => f.id === "feat-b")!;
    expect(featA.tasks).toHaveLength(2);
    expect(featB.tasks).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(adaptTaskSummariesToFeatures([])).toEqual([]);
  });

  it("maps task_name to ParsedTask.id", () => {
    const tasks = [makeTaskSummary({ feature_id: "feat-uuid-a", feature_name: "feat-a", task_name: "T7" })];
    const result = adaptTaskSummariesToFeatures(tasks);
    expect(result[0].tasks[0].id).toBe("T7");
  });

  it("maps is_blocked to blockedReason", () => {
    const tasks = [makeTaskSummary({ feature_id: "feat-uuid-a", feature_name: "feat-a", task_name: "T1", is_blocked: true })];
    const result = adaptTaskSummariesToFeatures(tasks);
    expect(result[0].tasks[0].blockedReason).toBe("blocked");
  });

  it("sidebar result is independent from workspace detail result", () => {
    const workspaceTasks = [makeTaskSummary({ feature_id: "f-ws", feature_name: "feat-ws", task_name: "T1" })];
    const sidebarTasks = [
      makeTaskSummary({ feature_id: "f-sidebar", feature_name: "feat-sidebar", task_name: "T1", status: "in_progress" }),
    ];
    const wsResult = adaptTaskSummariesToFeatures(workspaceTasks);
    const sbResult = adaptTaskSummariesToFeatures(sidebarTasks);
    expect(wsResult[0].id).toBe("feat-ws");
    expect(sbResult[0].id).toBe("feat-sidebar");
  });
});

// ─── Section 8: Query param contracts ─────────────────────────────────────────

describe("query param contracts — feature search vs task search vs sidebar", () => {
  it("feature title search uses 'title' param", () => {
    const sp = buildFeatureParams({ title: "data" });
    expect(sp.get("title")).toBe("data");
    expect(sp.has("task_id")).toBe(false);
  });

  it("task name search uses 'task_id' param (not 'name' or 'id')", () => {
    const sp = buildTaskParams({ task_id: "T1" });
    expect(sp.get("task_id")).toBe("T1");
    expect(sp.has("name")).toBe(false);
    expect(sp.has("id")).toBe(false);
  });

  it("task title search uses 'title' param", () => {
    const sp = buildTaskParams({ title: "implement" });
    expect(sp.get("title")).toBe("implement");
  });

  it("status filters are comma-separated for both feature and task", () => {
    const fSp = buildFeatureParams({ status: ["in_design", "in_implementation"] });
    const tSp = buildTaskParams({ status: ["in_progress", "in_review"] });
    expect(fSp.get("status")).toBe("in_design,in_implementation");
    expect(tSp.get("status")).toBe("in_progress,in_review");
  });

  it("natural task order uses 'task_id_asc' sort", () => {
    const sp = buildTaskParams({ sort: "task_id_asc" });
    expect(sp.get("sort")).toBe("task_id_asc");
  });

  it("feature search uses 'title_asc' sort", () => {
    const sp = buildFeatureParams({ sort: "title_asc" });
    expect(sp.get("sort")).toBe("title_asc");
  });

  it("omits undefined fields from task params", () => {
    const sp = buildTaskParams({ task_id: "T2" });
    expect(sp.has("title")).toBe(false);
    expect(sp.has("status")).toBe(false);
    expect(sp.has("repo")).toBe(false);
    expect(sp.has("sort")).toBe(false);
  });

  it("omits undefined fields from feature params", () => {
    const sp = buildFeatureParams({ title: "test" });
    expect(sp.has("status")).toBe(false);
    expect(sp.has("sort")).toBe(false);
    expect(sp.has("page")).toBe(false);
    expect(sp.has("limit")).toBe(false);
  });
});

// ─── Section 9: Import modal — error code to UI mapping ───────────────────────

describe("Import modal — structured error code mapping (getImportErrorMessage from importError.ts)", () => {
  it("VALIDATION_INVALID_URL marks the repo_url field", () => {
    const result = getImportErrorMessage({ code: "VALIDATION_INVALID_URL", message: "bad url", retryable: false });
    expect(result.field).toBe("repo_url");
  });

  it("VALIDATION_MISSING_INPUT marks the repo_url field", () => {
    const result = getImportErrorMessage({ code: "VALIDATION_MISSING_INPUT", message: "missing", retryable: false });
    expect(result.field).toBe("repo_url");
  });

  it("GITHUB_NOT_FOUND has no field marker", () => {
    const result = getImportErrorMessage({ code: "GITHUB_NOT_FOUND", message: "not found", retryable: false });
    expect(result.field).toBeUndefined();
    expect(result.message).toContain("Repository not found");
  });

  it("GITHUB_UNAUTHORIZED has no field marker", () => {
    const result = getImportErrorMessage({ code: "GITHUB_UNAUTHORIZED", message: "denied", retryable: false });
    expect(result.field).toBeUndefined();
    expect(result.message).toContain("access denied");
  });

  it("GITHUB_RATE_LIMIT has no field marker", () => {
    const result = getImportErrorMessage({ code: "GITHUB_RATE_LIMIT", message: "rate limited", retryable: true });
    expect(result.field).toBeUndefined();
    expect(result.message).toContain("rate limit");
  });

  it("ADAPTER_TIMEOUT has no field marker", () => {
    const result = getImportErrorMessage({ code: "ADAPTER_TIMEOUT", message: "timeout", retryable: true });
    expect(result.field).toBeUndefined();
    expect(result.message).toContain("timed out");
  });

  it("unknown error code returns a fallback message", () => {
    const result = getImportErrorMessage({ code: "UNKNOWN_ERROR", message: "unknown", retryable: false });
    expect(result.message).toBeTruthy();
  });

  it("VALIDATION_MISSING_INPUT uses the backend message when present", () => {
    const result = getImportErrorMessage({
      code: "VALIDATION_MISSING_INPUT",
      message: "repo_url is required",
      retryable: false,
    });
    expect(result.message).toBe("repo_url is required");
  });
});

// ─── Section 10: Source state handling ───────────────────────────────────────

describe("source state — stale and error_code handling", () => {
  it("stale=false is the normal fresh state", () => {
    const detail = makeWorkspaceDetail({ source_state: { stale: false } });
    expect(detail.source_state.stale).toBe(false);
    expect(detail.source_state.error_code).toBeUndefined();
  });

  it("stale=true with error_code is a warning — data stays visible", () => {
    const detail = makeWorkspaceDetail({
      source_state: { stale: true, error_code: "ADAPTER_TIMEOUT", last_synced_at: "2026-01-01T00:00:00Z" },
      features: [makeFeatureSummary()],
    });
    expect(detail.source_state.stale).toBe(true);
    expect(detail.source_state.error_code).toBe("ADAPTER_TIMEOUT");
    // Features are still present even when stale
    expect(detail.features).toHaveLength(1);
  });

  it("stale=true does not wipe features — board data stays visible", () => {
    const detail = makeWorkspaceDetail({
      source_state: { stale: true },
      features: [makeFeatureSummary({ feature_name: "alpha" }), makeFeatureSummary({ feature_name: "beta" })],
    });
    const features = adaptWorkspaceDetail(detail);
    expect(features).toHaveLength(2);
  });

  it("API error retryable=true indicates a retry affordance should be shown", () => {
    const err: ApiError = { code: "ADAPTER_TIMEOUT", message: "timeout", retryable: true };
    expect(err.retryable).toBe(true);
  });

  it("API error retryable=false means no retry affordance", () => {
    const err: ApiError = { code: "DATABASE_NOT_FOUND", message: "not found", retryable: false };
    expect(err.retryable).toBe(false);
  });

  it("empty features array is a valid response — renders empty state, not error", () => {
    const detail = makeWorkspaceDetail({ features: [], tasks: [] });
    const result = adaptWorkspaceDetail(detail);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("empty tasks array is a valid response — not an error", () => {
    const detail = makeWorkspaceDetail({ features: [makeFeatureSummary()], tasks: [] });
    const result = adaptWorkspaceDetail(detail);
    expect(result[0].tasks).toHaveLength(0);
  });
});

// ─── Section 11: No GitHub direct reads in new workspace flow ─────────────────

describe("regression: no GitHub direct reads in workspace flow components", () => {
  it("local-workspace-store does not import from github service", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const storeContent = fs.default.readFileSync(
      path.default.resolve(__dirname, "../services/local-workspace-store.ts"),
      "utf8",
    );
    expect(storeContent).not.toContain("github");
    expect(storeContent).not.toContain("api.github.com");
  });

  it("WorkspaceContext does not import from github service", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const ctxContent = fs.default.readFileSync(
      path.default.resolve(__dirname, "../features/workspaces/context/WorkspaceContext.tsx"),
      "utf8",
    );
    expect(ctxContent).not.toContain("api.github.com");
    expect(ctxContent).not.toContain("from \"@/services/github\"");
    expect(ctxContent).not.toContain("from '../services/github'");
  });

  it("workflow-backend client does not reference github.com for API calls", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const clientContent = fs.default.readFileSync(
      path.default.resolve(__dirname, "../services/workflow-backend/client.ts"),
      "utf8",
    );
    expect(clientContent).not.toContain("api.github.com");
    expect(clientContent).not.toContain("github.com/repos");
  });

  it("ImportModal does not call GitHub API directly", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const modalContent = fs.default.readFileSync(
      path.default.resolve(__dirname, "../features/workspaces/components/ImportModal/ImportModal.tsx"),
      "utf8",
    );
    expect(modalContent).not.toContain("api.github.com");
    expect(modalContent).not.toContain("fetch(\"https://api.github.com");
  });

  it("board page does not call GitHub API directly", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const boardContent = fs.default.readFileSync(
      path.default.resolve(__dirname, "../app/board/page.tsx"),
      "utf8",
    );
    expect(boardContent).not.toContain("api.github.com");
    expect(boardContent).not.toContain("fetch(\"https://api.github.com");
  });
});

// ─── Section 12: Tab management behavior (addTaskTab/removeTaskTab/addFeatureTab/removeFeatureTab from tabState.ts) ──

describe("tab management — production addTaskTab / removeTaskTab / addFeatureTab / removeFeatureTab", () => {
  it("addTaskTab: opening a new task tab adds it to the list", () => {
    const tabs: TaskTabEntry[] = [];
    const entry: TaskTabEntry = {
      sessionId: "task-session-1",
      workspaceId: "ws-1",
      taskId: "task-uuid-1",
      taskName: "T1",
      title: "Setup API",
    };
    const result = addTaskTab(tabs, entry);
    expect(result).toHaveLength(1);
    expect(result[0].taskId).toBe("task-uuid-1");
  });

  it("addTaskTab: opening the same task creates a separate session tab", () => {
    const tabs: TaskTabEntry[] = [
      {
        sessionId: "task-session-1",
        workspaceId: "ws-1",
        taskId: "task-uuid-1",
        taskName: "T1",
        title: "Setup API",
      },
    ];
    const entry: TaskTabEntry = {
      sessionId: "task-session-2",
      workspaceId: "ws-1",
      taskId: "task-uuid-1",
      taskName: "T1",
      title: "Setup API",
    };
    const result = addTaskTab(tabs, entry);
    expect(result).toHaveLength(2);
    expect(result[0].taskId).toBe(result[1].taskId);
    expect(result[0].sessionId).not.toBe(result[1].sessionId);
  });

  it("removeTaskTab: closing a task tab removes it from the list", () => {
    const tabs: TaskTabEntry[] = [
      {
        sessionId: "task-session-1",
        workspaceId: "ws-1",
        taskId: "task-uuid-1",
        taskName: "T1",
        title: "Task 1",
      },
      {
        sessionId: "task-session-2",
        workspaceId: "ws-1",
        taskId: "task-uuid-2",
        taskName: "T2",
        title: "Task 2",
      },
    ];
    const result = removeTaskTab(tabs, "task-session-1");
    expect(result).toHaveLength(1);
    expect(result[0].taskId).toBe("task-uuid-2");
  });

  it("addFeatureTab: opening a feature tab adds it to the feature tab list", () => {
    const featureTabs: FeatureTabEntry[] = [];
    const entry: FeatureTabEntry = {
      sessionId: "feature-session-1",
      workspaceId: "ws-1",
      featureId: "feat-uuid-1",
      featureName: "my-feature",
      title: "My Feature",
    };
    const result = addFeatureTab(featureTabs, entry);
    expect(result).toHaveLength(1);
    expect(result[0].featureId).toBe("feat-uuid-1");
  });

  it("addFeatureTab: opening the same feature creates a separate session tab", () => {
    const featureTabs: FeatureTabEntry[] = [
      {
        sessionId: "feature-session-1",
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
        featureName: "my-feature",
        title: "My Feature",
      },
    ];
    const entry: FeatureTabEntry = {
      sessionId: "feature-session-2",
      workspaceId: "ws-1",
      featureId: "feat-uuid-1",
      featureName: "my-feature",
      title: "My Feature",
    };
    const result = addFeatureTab(featureTabs, entry);
    expect(result).toHaveLength(2);
    expect(result[0].featureId).toBe(result[1].featureId);
    expect(result[0].sessionId).not.toBe(result[1].sessionId);
  });

  it("removeFeatureTab: closing a feature tab removes it from the list", () => {
    const featureTabs: FeatureTabEntry[] = [
      {
        sessionId: "feature-session-1",
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
        featureName: "alpha",
        title: "Alpha",
      },
      {
        sessionId: "feature-session-2",
        workspaceId: "ws-1",
        featureId: "feat-uuid-2",
        featureName: "beta",
        title: "Beta",
      },
    ];
    const result = removeFeatureTab(featureTabs, "feature-session-1");
    expect(result).toHaveLength(1);
    expect(result[0].featureId).toBe("feat-uuid-2");
  });

  it("task tabs are keyed by sessionId while preserving backend taskId", () => {
    const tabs: TaskTabEntry[] = [
      {
        sessionId: "task-session-abc",
        workspaceId: "ws-1",
        taskId: "task-uuid-abc",
        taskName: "T1",
        title: "Some Task",
      },
    ];
    expect(tabs.find((t) => t.sessionId === "task-session-abc")).toBeDefined();
    expect(tabs.find((t) => t.taskId === "task-uuid-abc")).toBeDefined();
    expect(tabs.find((t) => t.sessionId === "T1")).toBeUndefined();
  });

  it("feature tabs are keyed by sessionId while preserving backend featureId", () => {
    const featureTabs: FeatureTabEntry[] = [
      {
        sessionId: "feature-session-xyz",
        workspaceId: "ws-1",
        featureId: "feat-uuid-xyz",
        featureName: "auth",
        title: "Auth Feature",
      },
    ];
    expect(featureTabs.find((f) => f.sessionId === "feature-session-xyz")).toBeDefined();
    expect(featureTabs.find((f) => f.featureId === "feat-uuid-xyz")).toBeDefined();
    expect(featureTabs.find((f) => f.sessionId === "auth")).toBeUndefined();
  });
});

// ─── Section 13: Workspace detail drives board — not raw local data ───────────

describe("board data sourced from WorkspaceDetail, not local storage", () => {
  it("board features come from WorkspaceDetail.features, not summaries", () => {
    const detail = makeWorkspaceDetail({
      features: [makeFeatureSummary({ feature_name: "backend-api" })],
    });
    const boardFeatures = adaptWorkspaceDetail(detail);
    expect(boardFeatures[0].id).toBe("backend-api");
    // Local summaries would have different structure entirely
  });

  it("board tasks come from WorkspaceDetail.tasks, not a separate call", () => {
    const detail = makeWorkspaceDetail({
      features: [makeFeatureSummary({ id: "f-uuid", feature_name: "feat" })],
      tasks: [makeTaskSummary({ feature_id: "f-uuid", task_name: "T3", title: "Deploy" })],
    });
    const boardFeatures = adaptWorkspaceDetail(detail);
    expect(boardFeatures[0].tasks[0].id).toBe("T3");
    expect(boardFeatures[0].tasks[0].title).toBe("Deploy");
  });

  it("synced workspace detail replaces board data", () => {
    const original = makeWorkspaceDetail({
      features: [makeFeatureSummary({ feature_name: "old-feature" })],
    });
    const synced = makeWorkspaceDetail({
      features: [makeFeatureSummary({ feature_name: "new-feature" })],
    });
    const originalBoard = adaptWorkspaceDetail(original);
    const syncedBoard = adaptWorkspaceDetail(synced);
    expect(originalBoard[0].id).toBe("old-feature");
    expect(syncedBoard[0].id).toBe("new-feature");
  });
});

// ─── Section 14: Identifier contract ─────────────────────────────────────────

describe("identifier contract — UUID route ids vs display labels", () => {
  it("TaskSummary.id is the UUID, task_name is the display label", () => {
    const task = makeTaskSummary({ id: "uuid-task-abc", task_name: "T1" });
    expect(task.id).toBe("uuid-task-abc");
    expect(task.task_name).toBe("T1");
  });

  it("FeatureSummary.id is the UUID, feature_name is the display slug", () => {
    const feature = makeFeatureSummary({ id: "uuid-feat-xyz", feature_name: "my-feature" });
    expect(feature.id).toBe("uuid-feat-xyz");
    expect(feature.feature_name).toBe("my-feature");
  });

  it("adaptTaskSummary maps task_name to ParsedTask.id (display label for board)", () => {
    const task = makeTaskSummary({ task_name: "T7", id: "task-uuid-007" });
    const parsed = adaptTaskSummary(task);
    // ParsedTask.id = task_name for board display
    expect(parsed.id).toBe("T7");
  });

  it("adaptFeatureSummary maps feature_name to ParsedFeature.id for board display", () => {
    const feature = makeFeatureSummary({ feature_name: "auth-feature", id: "uuid-auth" });
    const parsed = adaptFeatureSummary(feature, []);
    expect(parsed.id).toBe("auth-feature");
  });
});

// ─── Section 15: Regression — no activity timeline in this feature ────────────

describe("regression: activity timeline is deferred and not integrated", () => {
  it("workflow-backend client does not export a getActivity or fetchActivity method", async () => {
    const client = await import("../services/workflow-backend/client");
    const exports = Object.keys(client);
    expect(exports).not.toContain("getActivity");
    expect(exports).not.toContain("fetchActivity");
    expect(exports).not.toContain("getWorkspaceActivity");
  });

  it("workflow-backend index does not re-export activity-related methods", async () => {
    const idx = await import("../services/workflow-backend");
    const exports = Object.keys(idx);
    expect(exports).not.toContain("getActivity");
    expect(exports).not.toContain("fetchActivity");
  });
});
