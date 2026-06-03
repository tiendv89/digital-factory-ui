import { describe, it, expect } from "vitest";
import { groupTrackedTasks } from "../features/board/components/TaskTrackingPanel/groupTasks";
import { TRACKED_SECTIONS } from "../features/board/components/TaskTrackingPanel/TaskTrackingPanel.types";
import type { ParsedFeature, ParsedTask } from "../services/yaml-parser";

const makeTask = (
  id: string,
  status: string,
  title = `Task ${id}`,
  overrides: Partial<ParsedTask> = {},
): ParsedTask => ({
  id,
  title,
  status,
  dependsOn: [],
  ...overrides,
});

const makeFeature = (
  id: string,
  tasks: ParsedTask[],
  title = `Feature ${id}`,
): ParsedFeature => ({
  id,
  title,
  featureStatus: "ready_for_implementation",
  tasks,
});

describe("groupTrackedTasks", () => {
  it("returns five sections in product order regardless of input", () => {
    const sections = groupTrackedTasks([]);
    expect(sections.map((s) => s.status)).toEqual([
      "blocked",
      "in_progress",
      "reviewing",
      "in_review",
      "ready",
    ]);
    expect(sections.map((s) => s.label)).toEqual(
      TRACKED_SECTIONS.map((s) => s.label),
    );
  });

  it("returns empty items arrays when there are no features", () => {
    const sections = groupTrackedTasks([]);
    for (const section of sections) {
      expect(section.items).toEqual([]);
    }
  });

  it("groups tasks by status across multiple features", () => {
    const f1 = makeFeature("alpha", [
      makeTask("T1", "in_progress", "Task T1"),
      makeTask("T2", "ready", "Task T2"),
      makeTask("T3", "done"),
    ]);
    const f2 = makeFeature("beta", [
      makeTask("T1", "in_review", "Task T1"),
      makeTask("T2", "ready", "Task T2"),
      makeTask("T3", "blocked"),
    ]);

    const sections = groupTrackedTasks([f1, f2]);
    const inProgress = sections.find((s) => s.status === "in_progress")!;
    const ready = sections.find((s) => s.status === "ready")!;
    const inReview = sections.find((s) => s.status === "in_review")!;

    expect(inProgress.items.map((i) => `${i.feature.id}/${i.task.id}`)).toEqual(
      ["alpha/T1"],
    );
    expect(ready.items.map((i) => `${i.feature.id}/${i.task.id}`)).toEqual([
      "alpha/T2",
      "beta/T2",
    ]);
    expect(inReview.items.map((i) => `${i.feature.id}/${i.task.id}`)).toEqual([
      "beta/T1",
    ]);
  });

  it("ignores tasks with statuses outside the tracked set", () => {
    const f = makeFeature("alpha", [
      makeTask("T1", "todo"),
      makeTask("T2", "done"),
      makeTask("T3", "cancelled"),
    ]);
    const sections = groupTrackedTasks([f]);
    for (const section of sections) {
      expect(section.items).toEqual([]);
    }
  });

  it("groups blocked tasks into the blocked section", () => {
    const f = makeFeature("alpha", [
      makeTask("T1", "blocked", "Stuck task"),
      makeTask("T2", "in_progress", "Active task"),
    ]);
    const sections = groupTrackedTasks([f]);
    const blocked = sections.find((s) => s.status === "blocked")!;
    const inProgress = sections.find((s) => s.status === "in_progress")!;
    expect(blocked.items).toHaveLength(1);
    expect(blocked.items[0].task.id).toBe("T1");
    expect(inProgress.items).toHaveLength(1);
    expect(inProgress.items[0].task.id).toBe("T2");
  });

  it("preserves the feature reference on each item", () => {
    const f = makeFeature("alpha", [makeTask("T1", "in_progress", "Task T1")]);
    const sections = groupTrackedTasks([f]);
    const inProgress = sections.find((s) => s.status === "in_progress")!;
    expect(inProgress.items).toHaveLength(1);
    expect(inProgress.items[0].feature).toBe(f);
    expect(inProgress.items[0].task.id).toBe("T1");
  });

  it("includes tasks regardless of pull request status", () => {
    const f = makeFeature("dashboard", [
      makeTask("T4", "in_review", "Merged task", {
        pr: { status: "closed", url: "https://example.com/pull/4" },
      }),
      makeTask("T5", "in_review", "Open task", {
        pr: { status: "open", url: "https://example.com/pull/5" },
      }),
      makeTask("T6", "ready", "Workspace PR task", {
        workspace_pr: { status: "open", url: "https://example.com/pull/6" },
      }),
      makeTask("T7", "in_progress", "No PR task"),
    ]);

    const sections = groupTrackedTasks([f]);
    const inReview = sections.find((s) => s.status === "in_review")!;
    const ready = sections.find((s) => s.status === "ready")!;
    const inProgress = sections.find((s) => s.status === "in_progress")!;

    expect(inReview.items.map((item) => item.task.id)).toEqual(["T4", "T5"]);
    expect(ready.items.map((item) => item.task.id)).toEqual(["T6"]);
    expect(inProgress.items.map((item) => item.task.id)).toEqual(["T7"]);
  });

  it("ignores tasks with untracked statuses", () => {
    const f = makeFeature("alpha", [
      makeTask("T1", "todo", "Todo Task"),
      makeTask("T2", "done", "Done Task"),
    ]);
    const sections = groupTrackedTasks([f]);
    for (const section of sections) {
      expect(section.items).toEqual([]);
    }
  });

  it("filters tasks by search query on task title", () => {
    const f = makeFeature("alpha", [
      makeTask("T1", "in_progress", "Token refresh flow"),
      makeTask("T2", "in_review", "JWT verification"),
    ]);
    const sections = groupTrackedTasks([f], "jwt");
    const inProgress = sections.find((s) => s.status === "in_progress")!;
    const inReview = sections.find((s) => s.status === "in_review")!;
    expect(inProgress.items).toHaveLength(0);
    expect(inReview.items).toHaveLength(1);
    expect(inReview.items[0].task.id).toBe("T2");
  });

  it("filters tasks by search query on feature id", () => {
    const f1 = makeFeature("auth-module", [
      makeTask("T1", "ready", "Some task"),
    ]);
    const f2 = makeFeature("billing", [
      makeTask("T2", "ready", "Another task"),
    ]);
    const sections = groupTrackedTasks([f1, f2], "auth");
    const ready = sections.find((s) => s.status === "ready")!;
    expect(ready.items).toHaveLength(1);
    expect(ready.items[0].feature.id).toBe("auth-module");
  });

  it("applies active status filter to restrict visible sections", () => {
    const f = makeFeature("alpha", [
      makeTask("T1", "in_progress"),
      makeTask("T2", "in_review"),
      makeTask("T3", "ready"),
    ]);
    const sections = groupTrackedTasks([f], "", { statuses: ["in_review"] });
    const inProgress = sections.find((s) => s.status === "in_progress")!;
    const inReview = sections.find((s) => s.status === "in_review")!;
    const ready = sections.find((s) => s.status === "ready")!;
    expect(inProgress.items).toHaveLength(0);
    expect(inReview.items).toHaveLength(1);
    expect(ready.items).toHaveLength(0);
  });

  it("sorts tasks in each section by newest task time first", () => {
    const f = makeFeature("alpha", [
      makeTask("T1", "in_review", "Older review", {
        log: [
          { action: "in_review", by: "agent", at: "2026-05-01T00:00:00Z" },
        ],
      }),
      makeTask("T2", "in_review", "Newest review", {
        log: [
          { action: "in_review", by: "agent", at: "2026-05-03T00:00:00Z" },
        ],
      }),
      makeTask("T3", "in_review", "Middle review", {
        execution: {
          actor_type: "agent",
          last_updated_at: "2026-05-02T00:00:00Z",
        },
      }),
    ]);

    const sections = groupTrackedTasks([f]);
    const inReview = sections.find((s) => s.status === "in_review")!;

    expect(inReview.items.map((item) => item.task.id)).toEqual([
      "T2",
      "T3",
      "T1",
    ]);
  });

  it("uses the newest available log or execution timestamp and keeps untimed tasks last", () => {
    const f = makeFeature("alpha", [
      makeTask("T1", "ready", "No timestamp"),
      makeTask("T2", "ready", "Execution only", {
        execution: {
          actor_type: "agent",
          last_updated_at: "2026-05-02T00:00:00Z",
        },
      }),
      makeTask("T3", "ready", "Newer log beats older execution", {
        execution: {
          actor_type: "agent",
          last_updated_at: "2026-05-01T00:00:00Z",
        },
        log: [
          { action: "ready", by: "agent", at: "2026-05-04T00:00:00Z" },
        ],
      }),
      makeTask("T4", "ready", "Invalid timestamp", {
        execution: {
          actor_type: "agent",
          last_updated_at: "not-a-date",
        },
      }),
    ]);

    const sections = groupTrackedTasks([f]);
    const ready = sections.find((s) => s.status === "ready")!;

    expect(ready.items.map((item) => item.task.id)).toEqual([
      "T3",
      "T2",
      "T1",
      "T4",
    ]);
  });
});
