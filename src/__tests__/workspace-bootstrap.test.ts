/**
 * T2 — Tests for workspace bootstrap, local storage management,
 * workspace switching, import modal wiring, and board data adapter.
 */

import { beforeEach, describe, expect, it } from "vitest";

// ─── localStorage shim ───────────────────────────────────────────────────────

const store: Record<string, string> = {};
const mockLS = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
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
  adaptWorkspaceDetail,
  adaptFeatureSummary,
  adaptTaskSummary,
  buildImportLocalSummary,
} from "../features/workspaces/lib/workspaceAdapter";

import type { LocalWorkspaceSummary } from "../services/workflow-backend/types";
import type { WorkspaceDetail, FeatureSummary, TaskSummary, ImportWorkspaceRequest } from "../services/workflow-backend/types";

// ─── fixtures ────────────────────────────────────────────────────────────────

function makeSummary(partial: Partial<LocalWorkspaceSummary> = {}): LocalWorkspaceSummary {
  return {
    workspaceId: "ws-1",
    name: "My Workspace",
    repo_url: "https://github.com/org/repo",
    default_branch: "main",
    last_opened_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

function makeTaskSummary(partial: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "uuid-task-1",
    task_id: "T1",
    task_name: "T1",
    feature_id: "uuid-feature-1",
    feature_name: "my-feature",
    title: "Setup API client",
    status: "in_progress",
    repo: "digital-factory-ui",
    branch: "feature/my-feature-T1",
    is_blocked: false,
    pr: null,
    workspace_pr: null,
    ...partial,
  };
}

function makeFeatureSummary(partial: Partial<FeatureSummary> = {}): FeatureSummary {
  return {
    id: "uuid-feature-1",
    feature_id: "my-feature",
    feature_name: "my-feature",
    title: "My Feature",
    status: "in_implementation",
    current_stage: "in_implementation",
    updated_at: "2026-01-01T00:00:00Z",
    task_counts: { total: 1, done: 0, in_progress: 1, blocked: 0, ready: 0, todo: 0 },
    ...partial,
  };
}

function makeWorkspaceDetail(
  features: FeatureSummary[] = [],
  tasks: TaskSummary[] = [],
  partial: Partial<WorkspaceDetail> = {},
): WorkspaceDetail {
  return {
    id: "ws-uuid-1",
    name: "My Workspace",
    slug: "my-workspace",
    repo_url: "https://github.com/org/repo",
    source_state: { stale: false },
    updated_at: "2026-01-01T00:00:00Z",
    features,
    tasks,
    ...partial,
  };
}

beforeEach(() => {
  mockLS.clear();
});

// ─── Local workspace store — summaries ───────────────────────────────────────

describe("getLocalWorkspaceSummaries", () => {
  it("returns empty array when storage is empty", () => {
    expect(getLocalWorkspaceSummaries()).toEqual([]);
  });

  it("returns stored summaries after save", () => {
    const s = makeSummary();
    saveLocalWorkspaceSummary(s);
    const result = getLocalWorkspaceSummaries();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(s);
  });

  it("returns empty array on invalid JSON", () => {
    store["dashboard:workspace-summaries"] = "invalid{{{{";
    expect(getLocalWorkspaceSummaries()).toEqual([]);
  });
});

describe("saveLocalWorkspaceSummary", () => {
  it("adds a new summary when none exists", () => {
    saveLocalWorkspaceSummary(makeSummary({ workspaceId: "ws-a" }));
    expect(getLocalWorkspaceSummaries()).toHaveLength(1);
  });

  it("updates an existing summary with the same workspaceId", () => {
    saveLocalWorkspaceSummary(makeSummary({ workspaceId: "ws-a", name: "Old Name" }));
    saveLocalWorkspaceSummary(makeSummary({ workspaceId: "ws-a", name: "New Name" }));
    const result = getLocalWorkspaceSummaries();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("New Name");
  });

  it("stores multiple distinct workspaces", () => {
    saveLocalWorkspaceSummary(makeSummary({ workspaceId: "ws-a" }));
    saveLocalWorkspaceSummary(makeSummary({ workspaceId: "ws-b" }));
    expect(getLocalWorkspaceSummaries()).toHaveLength(2);
  });
});

describe("removeLocalWorkspaceSummary", () => {
  it("removes the summary for the given workspaceId", () => {
    saveLocalWorkspaceSummary(makeSummary({ workspaceId: "ws-a" }));
    saveLocalWorkspaceSummary(makeSummary({ workspaceId: "ws-b" }));
    removeLocalWorkspaceSummary("ws-a");
    const result = getLocalWorkspaceSummaries();
    expect(result).toHaveLength(1);
    expect(result[0].workspaceId).toBe("ws-b");
  });

  it("is a no-op when workspaceId does not exist", () => {
    saveLocalWorkspaceSummary(makeSummary({ workspaceId: "ws-a" }));
    removeLocalWorkspaceSummary("ws-nonexistent");
    expect(getLocalWorkspaceSummaries()).toHaveLength(1);
  });
});

// ─── Local workspace store — selected ID ─────────────────────────────────────

describe("selectedWorkspaceId persistence", () => {
  it("returns null when nothing is stored", () => {
    expect(getSelectedWorkspaceId()).toBeNull();
  });

  it("stores and retrieves the selected workspace id", () => {
    setSelectedWorkspaceId("ws-42");
    expect(getSelectedWorkspaceId()).toBe("ws-42");
  });

  it("clears the selected workspace id", () => {
    setSelectedWorkspaceId("ws-42");
    clearSelectedWorkspaceId();
    expect(getSelectedWorkspaceId()).toBeNull();
  });

  it("overwriting sets the latest value", () => {
    setSelectedWorkspaceId("ws-a");
    setSelectedWorkspaceId("ws-b");
    expect(getSelectedWorkspaceId()).toBe("ws-b");
  });
});

// ─── Workspace adapter ───────────────────────────────────────────────────────

describe("adaptTaskSummary", () => {
  it("maps task_name to id", () => {
    const t = adaptTaskSummary(makeTaskSummary({ task_name: "T3" }));
    expect(t.id).toBe("T3");
  });

  it("maps title, status, and branch", () => {
    const t = adaptTaskSummary(makeTaskSummary({ title: "My Task", status: "ready", branch: "feat/T1" }));
    expect(t.title).toBe("My Task");
    expect(t.status).toBe("ready");
    expect(t.branch).toBe("feat/T1");
  });

  it("maps pr url and status", () => {
    const t = adaptTaskSummary(
      makeTaskSummary({ pr: { label: "PR", status: "open", repo: "repo", url: "https://github.com/pr/1" } }),
    );
    expect(t.pr).toEqual({ url: "https://github.com/pr/1", status: "open" });
  });

  it("maps workspace_pr url and status", () => {
    const t = adaptTaskSummary(
      makeTaskSummary({
        workspace_pr: { label: "WPR", status: "merged", repo: "repo", url: "https://github.com/pr/2" },
      }),
    );
    expect(t.workspace_pr).toEqual({ url: "https://github.com/pr/2", status: "merged" });
  });

  it("sets blockedReason when is_blocked is true", () => {
    const t = adaptTaskSummary(makeTaskSummary({ is_blocked: true }));
    expect(t.blockedReason).toBe("blocked");
  });

  it("leaves blockedReason undefined when is_blocked is false", () => {
    const t = adaptTaskSummary(makeTaskSummary({ is_blocked: false }));
    expect(t.blockedReason).toBeUndefined();
  });

  it("dependsOn is always empty array", () => {
    const t = adaptTaskSummary(makeTaskSummary());
    expect(t.dependsOn).toEqual([]);
  });
});

describe("adaptFeatureSummary", () => {
  it("maps feature_name to id", () => {
    const f = adaptFeatureSummary(makeFeatureSummary({ feature_name: "my-feature" }), []);
    expect(f.id).toBe("my-feature");
  });

  it("maps title and status", () => {
    const f = adaptFeatureSummary(makeFeatureSummary({ title: "My Feature", status: "in_tdd" }), []);
    expect(f.title).toBe("My Feature");
    expect(f.featureStatus).toBe("in_tdd");
  });

  it("assigns only tasks whose feature_id matches the feature UUID", () => {
    const feature = makeFeatureSummary({ id: "uuid-f1" });
    const tasks = [
      makeTaskSummary({ id: "t-1", task_name: "T1", feature_id: "uuid-f1" }),
      makeTaskSummary({ id: "t-2", task_name: "T2", feature_id: "uuid-f2" }),
    ];
    const f = adaptFeatureSummary(feature, tasks);
    expect(f.tasks).toHaveLength(1);
    expect(f.tasks[0].id).toBe("T1");
  });

  it("returns empty tasks when no tasks belong to the feature", () => {
    const f = adaptFeatureSummary(makeFeatureSummary({ id: "uuid-x" }), [
      makeTaskSummary({ feature_id: "uuid-y" }),
    ]);
    expect(f.tasks).toHaveLength(0);
  });
});

describe("adaptWorkspaceDetail", () => {
  it("returns empty array for workspace with no features", () => {
    expect(adaptWorkspaceDetail(makeWorkspaceDetail())).toEqual([]);
  });

  it("converts all features", () => {
    const features = [
      makeFeatureSummary({ id: "uuid-f1", feature_name: "feat-a" }),
      makeFeatureSummary({ id: "uuid-f2", feature_name: "feat-b" }),
    ];
    const result = adaptWorkspaceDetail(makeWorkspaceDetail(features, []));
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("feat-a");
    expect(result[1].id).toBe("feat-b");
  });

  it("routes tasks to their owning feature", () => {
    const features = [
      makeFeatureSummary({ id: "uuid-f1", feature_name: "feat-a" }),
      makeFeatureSummary({ id: "uuid-f2", feature_name: "feat-b" }),
    ];
    const tasks = [
      makeTaskSummary({ id: "t-1", task_name: "T1", feature_id: "uuid-f1" }),
      makeTaskSummary({ id: "t-2", task_name: "T2", feature_id: "uuid-f2" }),
      makeTaskSummary({ id: "t-3", task_name: "T3", feature_id: "uuid-f1" }),
    ];
    const result = adaptWorkspaceDetail(makeWorkspaceDetail(features, tasks));
    const featA = result.find((f) => f.id === "feat-a")!;
    const featB = result.find((f) => f.id === "feat-b")!;
    expect(featA.tasks).toHaveLength(2);
    expect(featB.tasks).toHaveLength(1);
  });
});

// ─── First load — bootstrap workspace ID selection ───────────────────────────

describe("resolveBootstrapWorkspaceId", () => {
  it("returns null when no summaries and no stored ID", () => {
    expect(resolveBootstrapWorkspaceId([], null)).toBeNull();
  });

  it("returns storedId when present, regardless of summaries", () => {
    const summaries = [
      makeSummary({ workspaceId: "ws-a", last_opened_at: "2026-01-02T00:00:00Z" }),
    ];
    expect(resolveBootstrapWorkspaceId(summaries, "ws-stored")).toBe("ws-stored");
  });

  it("returns null when storedId is null but no summaries exist", () => {
    expect(resolveBootstrapWorkspaceId([], null)).toBeNull();
  });

  it("returns the only summary workspaceId when storedId is null", () => {
    const summaries = [makeSummary({ workspaceId: "ws-only" })];
    expect(resolveBootstrapWorkspaceId(summaries, null)).toBe("ws-only");
  });

  it("returns the most recently opened workspace when storedId is null", () => {
    const summaries = [
      makeSummary({ workspaceId: "ws-old", last_opened_at: "2026-01-01T00:00:00Z" }),
      makeSummary({ workspaceId: "ws-recent", last_opened_at: "2026-06-01T00:00:00Z" }),
      makeSummary({ workspaceId: "ws-mid", last_opened_at: "2026-03-01T00:00:00Z" }),
    ];
    expect(resolveBootstrapWorkspaceId(summaries, null)).toBe("ws-recent");
  });

  it("does not mutate the input summaries array", () => {
    const summaries = [
      makeSummary({ workspaceId: "ws-a", last_opened_at: "2026-01-01T00:00:00Z" }),
      makeSummary({ workspaceId: "ws-b", last_opened_at: "2026-06-01T00:00:00Z" }),
    ];
    const original = summaries.map((s) => s.workspaceId);
    resolveBootstrapWorkspaceId(summaries, null);
    expect(summaries.map((s) => s.workspaceId)).toEqual(original);
  });
});

// ─── Workspace switching — local state update ─────────────────────────────────

describe("workspace switching — localStorage side effects", () => {
  beforeEach(() => mockLS.clear());

  it("updates last_opened_at for the selected workspace", () => {
    const before = "2026-01-01T00:00:00Z";
    saveLocalWorkspaceSummary(makeSummary({ workspaceId: "ws-a", last_opened_at: before }));

    const after = "2026-06-01T00:00:00Z";
    saveLocalWorkspaceSummary(makeSummary({ workspaceId: "ws-a", last_opened_at: after }));

    const summaries = getLocalWorkspaceSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].last_opened_at).toBe(after);
  });

  it("sets the selected workspace ID in localStorage after switching", () => {
    setSelectedWorkspaceId("ws-b");
    expect(getSelectedWorkspaceId()).toBe("ws-b");
  });

  it("replaces a previous selected workspace ID when switching", () => {
    setSelectedWorkspaceId("ws-a");
    setSelectedWorkspaceId("ws-b");
    expect(getSelectedWorkspaceId()).toBe("ws-b");
  });

  it("resolveBootstrapWorkspaceId picks newly switched workspace by storedId", () => {
    saveLocalWorkspaceSummary(makeSummary({ workspaceId: "ws-a", last_opened_at: "2026-01-01T00:00:00Z" }));
    saveLocalWorkspaceSummary(makeSummary({ workspaceId: "ws-b", last_opened_at: "2026-06-01T00:00:00Z" }));
    setSelectedWorkspaceId("ws-a");

    const summaries = getLocalWorkspaceSummaries();
    const storedId = getSelectedWorkspaceId();
    expect(resolveBootstrapWorkspaceId(summaries, storedId)).toBe("ws-a");
  });
});

// ─── Import workspace — local summary persistence ────────────────────────────

describe("buildImportLocalSummary", () => {
  const now = "2026-05-21T12:00:00.000Z";

  function makeDetail(partial: Partial<WorkspaceDetail> = {}): WorkspaceDetail {
    return makeWorkspaceDetail([], [], partial);
  }

  it("sets workspaceId from detail.id", () => {
    const detail = makeDetail({ id: "ws-uuid-99" });
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo" };
    const s = buildImportLocalSummary(detail, body, now);
    expect(s.workspaceId).toBe("ws-uuid-99");
  });

  it("uses detail.name when available", () => {
    const detail = makeDetail({ name: "My Detail Name" });
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo" };
    const s = buildImportLocalSummary(detail, body, now);
    expect(s.name).toBe("My Detail Name");
  });

  it("falls back to body.name when detail.name is empty", () => {
    const detail = makeDetail({ name: "" });
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo", name: "Body Name" };
    const s = buildImportLocalSummary(detail, body, now);
    expect(s.name).toBe("Body Name");
  });

  it("falls back to repo basename when neither detail.name nor body.name", () => {
    const detail = makeDetail({ name: "" });
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/my-project" };
    const s = buildImportLocalSummary(detail, body, now);
    expect(s.name).toBe("my-project");
  });

  it("strips .git suffix when computing repo basename", () => {
    const detail = makeDetail({ name: "" });
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/my-project.git" };
    const s = buildImportLocalSummary(detail, body, now);
    expect(s.name).toBe("my-project");
  });

  it("stores repo_url from body", () => {
    const detail = makeDetail();
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo" };
    const s = buildImportLocalSummary(detail, body, now);
    expect(s.repo_url).toBe("https://github.com/org/repo");
  });

  it("defaults default_branch to main when not provided", () => {
    const detail = makeDetail();
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo" };
    const s = buildImportLocalSummary(detail, body, now);
    expect(s.default_branch).toBe("main");
  });

  it("uses body.default_branch when provided", () => {
    const detail = makeDetail();
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo", default_branch: "develop" };
    const s = buildImportLocalSummary(detail, body, now);
    expect(s.default_branch).toBe("develop");
  });

  it("sets last_opened_at from the now parameter", () => {
    const detail = makeDetail();
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo" };
    const s = buildImportLocalSummary(detail, body, now);
    expect(s.last_opened_at).toBe(now);
  });

  it("import summary can be persisted and retrieved from local store", () => {
    const detail = makeDetail({ id: "ws-import-1", name: "Imported WS" });
    const body: ImportWorkspaceRequest = { repo_url: "https://github.com/org/repo" };
    const summary = buildImportLocalSummary(detail, body, now);

    saveLocalWorkspaceSummary(summary);
    setSelectedWorkspaceId(summary.workspaceId);

    const stored = getLocalWorkspaceSummaries();
    expect(stored).toHaveLength(1);
    expect(stored[0].workspaceId).toBe("ws-import-1");
    expect(getSelectedWorkspaceId()).toBe("ws-import-1");
  });
});
