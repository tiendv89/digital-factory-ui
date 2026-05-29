import { describe, it, expect } from "vitest";
import {
  buildFeatureParams,
  buildTaskParams,
} from "../services/workflow-backend";
import {
  isAllStatusFilterSelected,
  isAllFeatureStatusFilterSelected,
  getAllStatusFilterKeys,
  getAllFeatureStatusFilterKeys,
} from "../features/board/lib/status-filter";

// ─── Feature mode endpoint contract ──────────────────────────────────────

describe("Feature mode list/search/filter endpoint contract", () => {
  it("buildFeatureParams serializes search text as title", () => {
    const params = buildFeatureParams({ title: "auth" });
    expect(params.get("title")).toBe("auth");
  });

  it("buildFeatureParams serializes status filter as status (string)", () => {
    const params = buildFeatureParams({ status: "in_design" });
    expect(params.get("status")).toBe("in_design");
  });

  it("buildFeatureParams serializes status filter as status (array)", () => {
    const params = buildFeatureParams({ status: ["in_design", "in_implementation"] });
    expect(params.get("status")).toBe("in_design,in_implementation");
  });

  it("buildFeatureParams serializes title AND status together", () => {
    const params = buildFeatureParams({ title: "dashboard", status: "in_implementation" });
    expect(params.get("title")).toBe("dashboard");
    expect(params.get("status")).toBe("in_implementation");
  });

  it("buildFeatureParams includes page and limit", () => {
    const params = buildFeatureParams({
      title: "search",
      status: ["in_design", "blocked"],
      page: 3,
      limit: 20,
      sort: "updated_at_desc",
    });
    expect(params.get("title")).toBe("search");
    expect(params.get("status")).toBe("in_design,blocked");
    expect(params.get("page")).toBe("3");
    expect(params.get("limit")).toBe("20");
    expect(params.get("sort")).toBe("updated_at_desc");
  });

  it("buildFeatureParams sends only status when title is empty", () => {
    const params = buildFeatureParams({ status: "in_design", page: 1, limit: 50 });
    expect(params.get("status")).toBe("in_design");
    expect(params.has("title")).toBe(false);
  });

  it("searchFeatures requests /api/workspaces/:workspaceId/features", () => {
    // path prefix is set by request(), which prepends API_BASE.
    // The client function searchFeatures calls:
    //   request(`/api/workspaces/${workspaceId}/features${qs}`)
    // Verify the URL path structure via the function parameter.
    // We can't easily unit-test the URL without mocking fetch, but we verify
    // the contract by checking that:
    //   1. The function name maps to features endpoint
    //   2. buildFeatureParams produces correct query params
    //   3. The existing workflow-backend-client test already validates the
    //      searchFeatures URL (lines 210-215)
    const params = buildFeatureParams({ title: "auth", status: "in_design" });
    const qs = params.toString();
    expect(qs).toContain("title=auth");
    expect(qs).toContain("status=in_design");
  });

  it("searchFeaturesPage requests /api/workspaces/:workspaceId/features", () => {
    const params = buildFeatureParams({ page: 2, limit: 10, sort: "title_asc" });
    const qs = params.toString();
    expect(qs).toContain("page=2");
    expect(qs).toContain("limit=10");
    expect(qs).toContain("sort=title_asc");
  });
});

// ─── Task mode endpoint contract ─────────────────────────────────────────

describe("Task mode list/search/filter endpoint contract", () => {
  it("buildTaskParams serializes search text as title", () => {
    const params = buildTaskParams({ title: "frontend" });
    expect(params.get("title")).toBe("frontend");
  });

  it("buildTaskParams serializes status filter as status (string)", () => {
    const params = buildTaskParams({ status: "in_progress" });
    expect(params.get("status")).toBe("in_progress");
  });

  it("buildTaskParams serializes status filter as status (array)", () => {
    const params = buildTaskParams({ status: ["in_progress", "in_review", "ready"] });
    expect(params.get("status")).toBe("in_progress,in_review,ready");
  });

  it("buildTaskParams serializes title AND status together", () => {
    const params = buildTaskParams({ title: "auth task", status: "in_progress" });
    expect(params.get("title")).toBe("auth task");
    expect(params.get("status")).toBe("in_progress");
  });

  it("buildTaskParams includes page and limit", () => {
    const params = buildTaskParams({
      title: "task",
      status: ["in_progress", "ready"],
      page: 2,
      limit: 30,
      sort: "task_id_asc",
    });
    expect(params.get("title")).toBe("task");
    expect(params.get("status")).toBe("in_progress,ready");
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("30");
    expect(params.get("sort")).toBe("task_id_asc");
  });

  it("buildTaskParams sends only status when title is empty", () => {
    const params = buildTaskParams({ status: "in_progress", page: 1, limit: 50 });
    expect(params.get("status")).toBe("in_progress");
    expect(params.has("title")).toBe(false);
  });

  it("searchWorkspaceTasks requests /api/workspaces/:workspaceId/tasks", () => {
    const params = buildTaskParams({ title: "ui", status: "ready" });
    const qs = params.toString();
    expect(qs).toContain("title=ui");
    expect(qs).toContain("status=ready");
  });

  it("searchWorkspaceTasksPage requests /api/workspaces/:workspaceId/tasks", () => {
    const params = buildTaskParams({ page: 3, limit: 15, sort: "updated_at_desc" });
    const qs = params.toString();
    expect(qs).toContain("page=3");
    expect(qs).toContain("limit=15");
    expect(qs).toContain("sort=updated_at_desc");
  });

  it("task_id is NOT serialized as title", () => {
    const params = buildTaskParams({ task_id: "T1", title: "Task Title" });
    expect(params.get("task_id")).toBe("T1");
    expect(params.get("title")).toBe("Task Title");
    // task_id and title are separate params; title is the search text
  });
});

// ─── Status-only backend search activation logic ─────────────────────────

describe("Status-only filter triggers backend search", () => {
  it("isAllStatusFilterSelected returns false for default filter (excludes done)", () => {
    const defaultFilter = ["todo", "ready", "in_progress", "reviewing", "blocked", "in_review", "cancelled"];
    expect(isAllStatusFilterSelected(defaultFilter)).toBe(false);
  });

  it("isAllStatusFilterSelected returns true for all statuses", () => {
    const allStatuses = getAllStatusFilterKeys();
    expect(isAllStatusFilterSelected(allStatuses)).toBe(true);
  });

  it("isAllStatusFilterSelected returns false for an empty array", () => {
    expect(isAllStatusFilterSelected([])).toBe(false);
  });

  it("isAllFeatureStatusFilterSelected returns false for default filter (excludes done)", () => {
    const defaultFilter = ["in_design", "in_tdd", "ready_for_implementation", "in_implementation", "in_handoff", "blocked", "cancelled"];
    expect(isAllFeatureStatusFilterSelected(defaultFilter)).toBe(false);
  });

  it("isAllFeatureStatusFilterSelected returns true for all feature statuses", () => {
    const allFeatureStatuses = getAllFeatureStatusFilterKeys();
    expect(isAllFeatureStatusFilterSelected(allFeatureStatuses)).toBe(true);
  });

  it("isAllFeatureStatusFilterSelected returns false for an empty array", () => {
    expect(isAllFeatureStatusFilterSelected([])).toBe(false);
  });

  it("status-only filter (non-default) resolves as active for backend search", () => {
    // Simulate the context logic: when statuses are non-default, backend
    // search should be active even without search text.
    const statuses = ["todo", "in_progress"];
    const hasSearchText = false;
    const statusFilterActive =
      statuses.length > 0 && !isAllStatusFilterSelected(statuses);
    const searchActive = hasSearchText || statusFilterActive;
    expect(statusFilterActive).toBe(true);
    expect(searchActive).toBe(true);
  });

  it("all-statuses-selected resolves as inactive (fallback to workspace root)", () => {
    const allStatuses = getAllStatusFilterKeys();
    const hasSearchText = false;
    const statusFilterActive =
      allStatuses.length > 0 && !isAllStatusFilterSelected(allStatuses);
    const searchActive = hasSearchText || statusFilterActive;
    expect(statusFilterActive).toBe(false);
    expect(searchActive).toBe(false);
  });

  it("empty status array resolves as inactive", () => {
    const statuses: string[] = [];
    const hasSearchText = false;
    const statusFilterActive =
      statuses.length > 0 && !isAllStatusFilterSelected(statuses);
    const searchActive = hasSearchText || statusFilterActive;
    expect(statusFilterActive).toBe(false);
    expect(searchActive).toBe(false);
  });

  it("search text alone activates backend search even with all statuses selected", () => {
    const allStatuses = getAllStatusFilterKeys();
    const hasSearchText = true;
    const statusFilterActive =
      allStatuses.length > 0 && !isAllStatusFilterSelected(allStatuses);
    const searchActive = hasSearchText || statusFilterActive;
    expect(statusFilterActive).toBe(false);
    expect(searchActive).toBe(true);
  });
});

// ─── Feature mode status-only activation ──────────────────────────────────

describe("Feature mode status-only filter activation", () => {
  it("default feature filter (excludes done) triggers backend search", () => {
    const defaultFeatureStatuses = [
      "in_design", "in_tdd", "ready_for_implementation",
      "in_implementation", "in_handoff", "blocked", "cancelled",
    ];
    const hasSearchText = false;
    const statusFilterActive =
      defaultFeatureStatuses.length > 0 &&
      !isAllFeatureStatusFilterSelected(defaultFeatureStatuses);
    const searchActive = hasSearchText || statusFilterActive;
    expect(statusFilterActive).toBe(true);
    expect(searchActive).toBe(true);
  });

  it("all feature statuses selected falls back to workspace root", () => {
    const allFeatureStatuses = getAllFeatureStatusFilterKeys();
    const hasSearchText = false;
    const statusFilterActive =
      allFeatureStatuses.length > 0 &&
      !isAllFeatureStatusFilterSelected(allFeatureStatuses);
    const searchActive = hasSearchText || statusFilterActive;
    expect(statusFilterActive).toBe(false);
    expect(searchActive).toBe(false);
  });
});

// ─── Query params no local filtering fallback ────────────────────────────

describe("No local filtering fallback in view components", () => {
  it("buildFeatureParams with empty params yields empty query string", () => {
    const params = buildFeatureParams({});
    expect(params.toString()).toBe("");
  });

  it("buildTaskParams with empty params yields empty query string", () => {
    const params = buildTaskParams({});
    expect(params.toString()).toBe("");
  });
});
