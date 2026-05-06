import { describe, it, expect } from "vitest";
import {
  bucketTasksByStatus,
  buildTaskSegments,
  computeProgress,
  filterFeatureTasks,
  matchesSearch,
  matchesStatusFilter,
} from "@/features/board/lib/filter";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import type { ActiveFilters } from "@/features/board/types";

function makeTask(overrides: Partial<ParsedTask> = {}): ParsedTask {
  return {
    id: "T1",
    title: "Default title",
    status: "todo",
    dependsOn: [],
    ...overrides,
  };
}

function makeFeature(tasks: ParsedTask[]): ParsedFeature {
  return {
    id: "feat",
    title: "Test feature",
    featureStatus: "in_implementation",
    tasks,
  };
}

const noFilters: ActiveFilters = { statuses: [] };

describe("matchesSearch", () => {
  it("returns true for empty/whitespace query", () => {
    const t = makeTask();
    expect(matchesSearch(t, "")).toBe(true);
    expect(matchesSearch(t, "   ")).toBe(true);
  });

  it("matches case-insensitively against title and id", () => {
    const t = makeTask({ id: "T42", title: "Implement Login" });
    expect(matchesSearch(t, "login")).toBe(true);
    expect(matchesSearch(t, "LOGIN")).toBe(true);
    expect(matchesSearch(t, "t42")).toBe(true);
    expect(matchesSearch(t, "logout")).toBe(false);
  });
});

describe("matchesStatusFilter", () => {
  it("passes everything when filters are empty", () => {
    const t = makeTask({ status: "in_progress" });
    expect(matchesStatusFilter(t, { statuses: [] })).toBe(true);
  });

  it("matches when status is in the list", () => {
    const t = makeTask({ status: "in_progress" });
    expect(
      matchesStatusFilter(t, { statuses: ["todo", "in_progress"] }),
    ).toBe(true);
  });

  it("rejects when status is not in the list", () => {
    const t = makeTask({ status: "done" });
    expect(matchesStatusFilter(t, { statuses: ["ready"] })).toBe(false);
  });
});

describe("filterFeatureTasks", () => {
  const feature = makeFeature([
    makeTask({ id: "T1", title: "alpha", status: "todo" }),
    makeTask({ id: "T2", title: "beta", status: "in_progress" }),
    makeTask({ id: "T3", title: "alpha extra", status: "done" }),
  ]);

  it("returns all tasks with no query and no filters", () => {
    expect(filterFeatureTasks(feature, "", noFilters)).toHaveLength(3);
  });

  it("filters by status", () => {
    const result = filterFeatureTasks(feature, "", {
      statuses: ["in_progress"],
    });
    expect(result.map((t) => t.id)).toEqual(["T2"]);
  });

  it("filters by search query", () => {
    const result = filterFeatureTasks(feature, "alpha", noFilters);
    expect(result.map((t) => t.id)).toEqual(["T1", "T3"]);
  });

  it("combines query and status filters", () => {
    const result = filterFeatureTasks(feature, "alpha", { statuses: ["done"] });
    expect(result.map((t) => t.id)).toEqual(["T3"]);
  });
});

describe("bucketTasksByStatus", () => {
  it("groups tasks into the seven canonical status buckets", () => {
    const tasks = [
      makeTask({ id: "T1", status: "todo" }),
      makeTask({ id: "T2", status: "in_progress" }),
      makeTask({ id: "T3", status: "in_progress" }),
      makeTask({ id: "T4", status: "done" }),
    ];
    const buckets = bucketTasksByStatus(tasks);
    expect(buckets.todo.map((t) => t.id)).toEqual(["T1"]);
    expect(buckets.in_progress.map((t) => t.id)).toEqual(["T2", "T3"]);
    expect(buckets.done.map((t) => t.id)).toEqual(["T4"]);
    expect(buckets.ready).toEqual([]);
    expect(buckets.blocked).toEqual([]);
    expect(buckets.in_review).toEqual([]);
    expect(buckets.cancelled).toEqual([]);
  });

  it("treats unknown statuses as todo", () => {
    const tasks = [makeTask({ id: "T1", status: "weird" })];
    expect(bucketTasksByStatus(tasks).todo.map((t) => t.id)).toEqual(["T1"]);
  });
});

describe("buildTaskSegments", () => {
  it("returns empty array for no tasks", () => {
    expect(buildTaskSegments([])).toEqual([]);
  });

  it("emits one segment per non-empty status, in canonical order", () => {
    const tasks = [
      makeTask({ id: "T1", status: "done" }),
      makeTask({ id: "T2", status: "ready" }),
      makeTask({ id: "T3", status: "ready" }),
    ];
    const segments = buildTaskSegments(tasks);
    expect(segments).toEqual([
      { status: "ready", count: 2 },
      { status: "done", count: 1 },
    ]);
  });
});

describe("computeProgress", () => {
  it("counts done tasks vs total", () => {
    const tasks = [
      makeTask({ status: "done" }),
      makeTask({ status: "in_progress" }),
      makeTask({ status: "done" }),
      makeTask({ status: "ready" }),
    ];
    expect(computeProgress(tasks)).toEqual({ done: 2, total: 4 });
  });

  it("returns 0/0 for empty tasks", () => {
    expect(computeProgress([])).toEqual({ done: 0, total: 0 });
  });
});
