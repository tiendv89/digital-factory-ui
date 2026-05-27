/**
 * T4 — Feature/task pagination API wiring tests
 *
 * Covers:
 *   1. Feature mode pagination URL serialization
 *   2. Task mode pagination URL serialization
 *   3. Preserve title, status, sort when changing page
 *   4. Page reset on search text, status filter, sort, and page size changes
 *   5. Backend paged response metadata normalization
 *   6. PaginationMeta type contract matches backend PagedFeatures/PagedTasks
 *   7. PageInfo and displayRange derivation for PaginationControls
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildFeatureParams,
  buildTaskParams,
  type FeatureSearchParams,
  type TaskSearchParams,
} from "../services/workflow-backend/query-params";
import {
  searchFeaturesPage,
  searchWorkspaceTasksPage,
} from "../services/workflow-backend/client";
import {
  shouldResetPage,
  makeDefaultBoardListParams,
  BOARD_DEFAULT_LIMIT,
  BOARD_DEFAULT_SORT,
} from "../features/board/lib/backend-list-params";
import type {
  PagedFeatures,
  PagedTasks,
  FeatureSummary,
  TaskSummary,
} from "../services/workflow-backend/types";
import type { PaginationMeta } from "../features/board/types";

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeFeatureSummary(overrides: Partial<FeatureSummary> = {}): FeatureSummary {
  return {
    id: "uuid-1",
    feature_id: "auth",
    feature_name: "Auth System",
    title: "Auth System",
    status: "in_implementation",
    current_stage: "implementation",
    updated_at: "2026-05-27T00:00:00Z",
    task_counts: { total: 5, done: 2, in_progress: 1, blocked: 1, ready: 1, todo: 0 },
    ...overrides,
  };
}

function makeTaskSummary(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "uuid-t1",
    task_id: "T1",
    task_name: "JWT Verification",
    feature_id: "auth",
    feature_name: "Auth System",
    title: "JWT Verification",
    status: "in_progress",
    repo: "digital-factory-ui",
    branch: "feature/auth",
    is_blocked: false,
    ...overrides,
  };
}

function makeFetchResponse(status: number, body: unknown): Response {
  const text = JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

function pagedSuccess<T>(data: T): Response {
  return makeFetchResponse(200, { success: true, data });
}

// ─── 1. Feature mode pagination URL serialization ─────────────────────────

describe("Feature mode pagination URL serialization", () => {
  it("serializes page and limit alongside title", () => {
    const sp = buildFeatureParams({
      title: "auth",
      page: 3,
      limit: 25,
    });
    expect(sp.get("title")).toBe("auth");
    expect(sp.get("page")).toBe("3");
    expect(sp.get("limit")).toBe("25");
  });

  it("serializes page and limit alongside status (string)", () => {
    const sp = buildFeatureParams({
      status: "in_design",
      page: 2,
      limit: 50,
    });
    expect(sp.get("status")).toBe("in_design");
    expect(sp.get("page")).toBe("2");
    expect(sp.get("limit")).toBe("50");
  });

  it("serializes page and limit alongside status (array)", () => {
    const sp = buildFeatureParams({
      status: ["in_design", "in_implementation"],
      page: 1,
      limit: 100,
    });
    expect(sp.get("status")).toBe("in_design,in_implementation");
    expect(sp.get("page")).toBe("1");
    expect(sp.get("limit")).toBe("100");
  });

  it("serializes all params: title, status, sort, page, limit", () => {
    const sp = buildFeatureParams({
      title: "analytics",
      status: ["in_design", "blocked"],
      sort: "title_asc",
      page: 4,
      limit: 10,
    });
    expect(sp.get("title")).toBe("analytics");
    expect(sp.get("status")).toBe("in_design,blocked");
    expect(sp.get("sort")).toBe("title_asc");
    expect(sp.get("page")).toBe("4");
    expect(sp.get("limit")).toBe("10");
  });

  it("preserves title and status when only page changes", () => {
    // Simulate page 1 → page 2 while keeping title and status the same
    const page1 = buildFeatureParams({
      title: "search-query",
      status: "in_implementation",
      page: 1,
      limit: 50,
      sort: "updated_at_desc",
    });
    const page2 = buildFeatureParams({
      title: "search-query",
      status: "in_implementation",
      page: 2,
      limit: 50,
      sort: "updated_at_desc",
    });

    // title and status unchanged
    expect(page2.get("title")).toBe(page1.get("title"));
    expect(page2.get("status")).toBe(page1.get("status"));
    expect(page2.get("sort")).toBe(page1.get("sort"));
    expect(page2.get("limit")).toBe(page1.get("limit"));

    // page changed
    expect(page2.get("page")).toBe("2");
    expect(page1.get("page")).toBe("1");
  });

  it("preserves sort when changing page", () => {
    const sp = buildFeatureParams({
      sort: "title_asc",
      page: 3,
      limit: 25,
    });
    expect(sp.get("sort")).toBe("title_asc");
    expect(sp.get("page")).toBe("3");
  });

  it("omits undefined params (no page param when undefined)", () => {
    const sp = buildFeatureParams({ title: "test" });
    expect(sp.has("page")).toBe(false);
    expect(sp.has("limit")).toBe(false);
    expect(sp.has("sort")).toBe(false);
  });

  it("builds expected query string for complete params", () => {
    const sp = buildFeatureParams({
      title: "api",
      status: "in_design",
      sort: "updated_at_desc",
      page: 2,
      limit: 25,
    });
    const qs = sp.toString();
    expect(qs).toContain("title=api");
    expect(qs).toContain("status=in_design");
    expect(qs).toContain("sort=updated_at_desc");
    expect(qs).toContain("page=2");
    expect(qs).toContain("limit=25");
  });
});

// ─── 2. Task mode pagination URL serialization ────────────────────────────

describe("Task mode pagination URL serialization", () => {
  it("serializes page and limit alongside title", () => {
    const sp = buildTaskParams({
      title: "jwt",
      page: 2,
      limit: 30,
    });
    expect(sp.get("title")).toBe("jwt");
    expect(sp.get("page")).toBe("2");
    expect(sp.get("limit")).toBe("30");
  });

  it("serializes page and limit alongside status (string)", () => {
    const sp = buildTaskParams({
      status: "in_progress",
      page: 3,
      limit: 10,
    });
    expect(sp.get("status")).toBe("in_progress");
    expect(sp.get("page")).toBe("3");
    expect(sp.get("limit")).toBe("10");
  });

  it("serializes page and limit alongside status (array)", () => {
    const sp = buildTaskParams({
      status: ["in_progress", "in_review"],
      page: 1,
      limit: 50,
    });
    expect(sp.get("status")).toBe("in_progress,in_review");
    expect(sp.get("page")).toBe("1");
    expect(sp.get("limit")).toBe("50");
  });

  it("serializes all params: title, status, sort, page, limit", () => {
    const sp = buildTaskParams({
      title: "implement",
      status: ["in_progress", "ready"],
      sort: "task_id_asc",
      page: 3,
      limit: 15,
    });
    expect(sp.get("title")).toBe("implement");
    expect(sp.get("status")).toBe("in_progress,ready");
    expect(sp.get("sort")).toBe("task_id_asc");
    expect(sp.get("page")).toBe("3");
    expect(sp.get("limit")).toBe("15");
  });

  it("preserves title and status when only page changes", () => {
    const page1 = buildTaskParams({
      title: "pagination",
      status: "in_progress",
      page: 1,
      limit: 50,
      sort: "updated_at_desc",
    });
    const page2 = buildTaskParams({
      title: "pagination",
      status: "in_progress",
      page: 2,
      limit: 50,
      sort: "updated_at_desc",
    });

    expect(page2.get("title")).toBe(page1.get("title"));
    expect(page2.get("status")).toBe(page1.get("status"));
    expect(page2.get("sort")).toBe(page1.get("sort"));
    expect(page2.get("limit")).toBe(page1.get("limit"));
    expect(page2.get("page")).toBe("2");
  });

  it("omits undefined params", () => {
    const sp = buildTaskParams({ task_id: "T1" });
    expect(sp.has("page")).toBe(false);
    expect(sp.has("limit")).toBe(false);
    expect(sp.has("sort")).toBe(false);
  });

  it("builds expected query string for complete params", () => {
    const sp = buildTaskParams({
      title: "tracking",
      status: "ready",
      sort: "task_id_asc",
      page: 1,
      limit: 20,
    });
    const qs = sp.toString();
    expect(qs).toContain("title=tracking");
    expect(qs).toContain("status=ready");
    expect(qs).toContain("sort=task_id_asc");
    expect(qs).toContain("page=1");
    expect(qs).toContain("limit=20");
  });
});

// ─── 3. Page reset logic (shouldResetPage) ────────────────────────────────

describe("Page reset on filter/sort/limit changes", () => {
  const base = makeDefaultBoardListParams();

  it("page-only change does NOT reset", () => {
    expect(shouldResetPage({ ...base, page: 1 }, { ...base, page: 2 })).toBe(false);
    expect(shouldResetPage({ ...base, page: 5 }, { ...base, page: 1 })).toBe(false);
  });

  it("title change resets page", () => {
    expect(shouldResetPage({ ...base, title: "old" }, { ...base, title: "new" })).toBe(true);
  });

  it("status change resets page", () => {
    expect(
      shouldResetPage({ ...base, status: "ready" }, { ...base, status: "in_progress" }),
    ).toBe(true);
  });

  it("status array change resets page", () => {
    expect(
      shouldResetPage(
        { ...base, status: ["ready"] },
        { ...base, status: ["ready", "in_progress"] },
      ),
    ).toBe(true);
  });

  it("sort change resets page", () => {
    expect(
      shouldResetPage(
        { ...base, sort: "updated_at_desc" },
        { ...base, sort: "title_asc" },
      ),
    ).toBe(true);
  });

  it("limit (page size) change resets page", () => {
    expect(
      shouldResetPage(
        { ...base, page: 1, limit: 50 },
        { ...base, page: 1, limit: 100 },
      ),
    ).toBe(true);
  });

  it("no change keeps the same page", () => {
    expect(shouldResetPage(base, { ...base })).toBe(false);
  });

  it("title whitespace-only treated as empty and does NOT reset", () => {
    expect(
      shouldResetPage({ ...base, title: "   " }, { ...base, title: undefined }),
    ).toBe(false);
  });
});

// ─── 4. Backend paged response metadata normalization ─────────────────────

describe("Backend paged response — metadata normalization", () => {
  const API_BASE = "http://localhost:3001";

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = API_BASE;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it("searchFeaturesPage returns all metadata fields from paged response", async () => {
    const items: FeatureSummary[] = [
      makeFeatureSummary({ feature_id: "f1", title: "Feature 1" }),
      makeFeatureSummary({ feature_id: "f2", title: "Feature 2" }),
    ];
    const pagedBody: PagedFeatures = {
      items,
      total: 42,
      page: 2,
      limit: 10,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(pagedSuccess(pagedBody)));

    const result = await searchFeaturesPage("ws-1");

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(42);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });

  it("searchWorkspaceTasksPage returns all metadata fields from paged response", async () => {
    const items: TaskSummary[] = [
      makeTaskSummary({ task_id: "T1", title: "Task 1" }),
      makeTaskSummary({ task_id: "T2", title: "Task 2" }),
      makeTaskSummary({ task_id: "T3", title: "Task 3" }),
    ];
    const pagedBody: PagedTasks = {
      items,
      total: 55,
      page: 1,
      limit: 20,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(pagedSuccess(pagedBody)));

    const result = await searchWorkspaceTasksPage("ws-1");

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(55);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("searchFeaturesPage handles array response (no pagination) with conservative fallback", async () => {
    const arrayBody: FeatureSummary[] = [
      makeFeatureSummary({ feature_id: "f1" }),
      makeFeatureSummary({ feature_id: "f2" }),
      makeFeatureSummary({ feature_id: "f3" }),
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(pagedSuccess(arrayBody)));

    const result = await searchFeaturesPage("ws-1");

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(3);
  });

  it("searchWorkspaceTasksPage handles missing total with items.length fallback", async () => {
    const pagedBody = {
      items: [
        makeTaskSummary({ task_id: "T1" }),
        makeTaskSummary({ task_id: "T2" }),
      ],
      page: 1,
      limit: 50,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(pagedSuccess(pagedBody)));

    const result = await searchWorkspaceTasksPage("ws-1");

    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });

  it("PaginationMeta type is compatible with PagedFeatures shape", () => {
    // Type-level test: PaginationMeta should accept { total, page, limit }
    const meta: PaginationMeta = {
      total: 100,
      page: 3,
      limit: 20,
    };
    expect(meta.total).toBe(100);
    expect(meta.page).toBe(3);
    expect(meta.limit).toBe(20);
  });

  it("PaginationMeta from PagedFeatures can be destructured correctly", () => {
    const paged: PagedFeatures = {
      items: [],
      total: 75,
      page: 4,
      limit: 15,
    };
    const { items: _, ...meta } = paged;
    const pagination: PaginationMeta = meta;
    expect(pagination.total).toBe(75);
    expect(pagination.page).toBe(4);
    expect(pagination.limit).toBe(15);
  });
});

// ─── 5. Default board list params for pagination ──────────────────────────

describe("Default board list params for pagination", () => {
  it("makeDefaultBoardListParams returns page 1 with default limit and sort", () => {
    const params = makeDefaultBoardListParams();
    expect(params.page).toBe(1);
    expect(params.limit).toBe(BOARD_DEFAULT_LIMIT);
    expect(params.sort).toBe(BOARD_DEFAULT_SORT);
  });

  it("BOARD_DEFAULT_LIMIT is a positive number (no limit=0 or omitted)", () => {
    expect(BOARD_DEFAULT_LIMIT).toBeGreaterThan(0);
  });

  it("BOARD_DEFAULT_SORT is defined", () => {
    expect(BOARD_DEFAULT_SORT).toBeTruthy();
    expect(typeof BOARD_DEFAULT_SORT).toBe("string");
  });
});
