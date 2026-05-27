import { describe, it, expect } from "vitest";
import { groupTrackedTasks } from "../features/board/components/TaskTrackingPanel/groupTasks";
import { TRACKED_SECTIONS } from "../features/board/components/TaskTrackingPanel/TaskTrackingPanel.types";
import { SIDEBAR_TASK_PARAMS } from "../services/workflow-backend/query-params";
import type { ParsedFeature, ParsedTask } from "../services/yaml-parser";

const makeTask = (
  id: string,
  status: string,
  overrides: Partial<ParsedTask> = {},
): ParsedTask => ({
  id,
  title: `Task ${id}`,
  status,
  dependsOn: [],
  ...overrides,
});

const makeFeature = (id: string, tasks: ParsedTask[]): ParsedFeature => ({
  id,
  title: `Feature ${id}`,
  featureStatus: "in_implementation",
  tasks,
});

// ─── TRACKED_SECTIONS includes in_reviewing ───────────────────────────────────

describe("TRACKED_SECTIONS — includes in_reviewing", () => {
  it("has in_reviewing as the third section (index 2)", () => {
    expect(TRACKED_SECTIONS[2].status).toBe("in_reviewing");
    expect(TRACKED_SECTIONS[2].label).toBe("IN REVIEWING");
  });

  it("positions in_reviewing directly after in_progress (index 1)", () => {
    expect(TRACKED_SECTIONS[1].status).toBe("in_progress");
    expect(TRACKED_SECTIONS[2].status).toBe("in_reviewing");
  });

  it("contains 5 sections total", () => {
    expect(TRACKED_SECTIONS).toHaveLength(5);
  });

  it("preserves full section order: blocked, in_progress, in_reviewing, in_review, ready", () => {
    expect(TRACKED_SECTIONS.map((s) => s.status)).toEqual([
      "blocked",
      "in_progress",
      "in_reviewing",
      "in_review",
      "ready",
    ]);
  });
});

// ─── groupTrackedTasks — in_reviewing bucket ─────────────────────────────────

describe("groupTrackedTasks — in_reviewing section", () => {
  it("places in_reviewing tasks in the in_reviewing section at index 2", () => {
    const feature = makeFeature("auth", [
      makeTask("T1", "in_progress"),
      makeTask("T2", "in_reviewing"),
      makeTask("T3", "in_review"),
    ]);
    const sections = groupTrackedTasks([feature]);

    expect(sections[2].status).toBe("in_reviewing");
    expect(sections[2].items).toHaveLength(1);
    expect(sections[2].items[0].task.id).toBe("T2");
  });

  it("keeps in_reviewing tasks out of in_progress and in_review sections", () => {
    const feature = makeFeature("auth", [
      makeTask("T1", "in_reviewing"),
    ]);
    const sections = groupTrackedTasks([feature]);

    const inProgress = sections.find((s) => s.status === "in_progress")!;
    const inReview = sections.find((s) => s.status === "in_review")!;
    expect(inProgress.items).toHaveLength(0);
    expect(inReview.items).toHaveLength(0);
  });

  it("ignores todo and done tasks — not placed in in_reviewing", () => {
    const feature = makeFeature("auth", [
      makeTask("T1", "todo"),
      makeTask("T2", "done"),
    ]);
    const sections = groupTrackedTasks([feature]);
    const inReviewing = sections.find((s) => s.status === "in_reviewing")!;
    expect(inReviewing.items).toHaveLength(0);
  });

  it("returns empty in_reviewing section when no tasks have that status", () => {
    const sections = groupTrackedTasks([]);
    const inReviewing = sections.find((s) => s.status === "in_reviewing")!;
    expect(inReviewing.items).toHaveLength(0);
  });

  it("applies search query filter to in_reviewing tasks", () => {
    const feature = makeFeature("auth", [
      makeTask("T1", "in_reviewing", { title: "Review JWT token logic" }),
      makeTask("T2", "in_reviewing", { title: "Setup database schema" }),
    ]);
    const sections = groupTrackedTasks([feature], "jwt");
    const inReviewing = sections.find((s) => s.status === "in_reviewing")!;
    expect(inReviewing.items).toHaveLength(1);
    expect(inReviewing.items[0].task.id).toBe("T1");
  });

  it("applies active status filter to exclude in_reviewing", () => {
    const feature = makeFeature("auth", [
      makeTask("T1", "in_reviewing"),
      makeTask("T2", "in_progress"),
    ]);
    const sections = groupTrackedTasks([feature], "", { statuses: ["in_progress"] });
    const inReviewing = sections.find((s) => s.status === "in_reviewing")!;
    const inProgress = sections.find((s) => s.status === "in_progress")!;
    expect(inReviewing.items).toHaveLength(0);
    expect(inProgress.items).toHaveLength(1);
  });

  it("groups in_reviewing tasks from multiple features", () => {
    const f1 = makeFeature("alpha", [makeTask("T1", "in_reviewing")]);
    const f2 = makeFeature("beta", [makeTask("T2", "in_reviewing")]);
    const sections = groupTrackedTasks([f1, f2]);
    const inReviewing = sections.find((s) => s.status === "in_reviewing")!;
    expect(inReviewing.items).toHaveLength(2);
    const ids = inReviewing.items.map((i) => i.task.id);
    expect(ids).toContain("T1");
    expect(ids).toContain("T2");
  });
});

// ─── SIDEBAR_TASK_PARAMS includes in_reviewing ────────────────────────────────

describe("SIDEBAR_TASK_PARAMS — includes in_reviewing", () => {
  it("includes in_reviewing in the status parameter", () => {
    const statusParam = SIDEBAR_TASK_PARAMS.get("status") ?? "";
    const statuses = statusParam.split(",");
    expect(statuses).toContain("in_reviewing");
  });

  it("lists statuses in order: blocked, in_progress, in_reviewing, in_review, ready", () => {
    expect(SIDEBAR_TASK_PARAMS.get("status")).toBe(
      "blocked,in_progress,in_reviewing,in_review,ready",
    );
  });
});
