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
  it("returns three sections in canonical order regardless of input", () => {
    const sections = groupTrackedTasks([]);
    expect(sections.map((s) => s.status)).toEqual([
      "in_progress",
      "ready",
      "in_review",
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
      makeTask("T1", "in_progress", "Task T1", {
        pr: { status: "open", url: "https://example.com/pull/1" },
      }),
      makeTask("T2", "ready", "Task T2", {
        pr: { status: "open", url: "https://example.com/pull/2" },
      }),
      makeTask("T3", "done"),
    ]);
    const f2 = makeFeature("beta", [
      makeTask("T1", "in_review", "Task T1", {
        pr: { status: "open", url: "https://example.com/pull/3" },
      }),
      makeTask("T2", "ready", "Task T2", {
        pr: { status: "open", url: "https://example.com/pull/4" },
      }),
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
      makeTask("T4", "blocked"),
    ]);
    const sections = groupTrackedTasks([f]);
    for (const section of sections) {
      expect(section.items).toEqual([]);
    }
  });

  it("preserves the feature reference on each item", () => {
    const f = makeFeature("alpha", [
      makeTask("T1", "in_progress", "Task T1", {
        pr: { status: "open", url: "https://example.com/pull/1" },
      }),
    ]);
    const sections = groupTrackedTasks([f]);
    const inProgress = sections.find((s) => s.status === "in_progress")!;
    expect(inProgress.items).toHaveLength(1);
    expect(inProgress.items[0].feature).toBe(f);
    expect(inProgress.items[0].task.id).toBe("T1");
  });

  it("only includes tracked tasks that belong to an open pull request", () => {
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

    expect(inReview.items.map((item) => item.task.id)).toEqual(["T5"]);
    expect(ready.items.map((item) => item.task.id)).toEqual(["T6"]);
    expect(inProgress.items).toEqual([]);
  });

  it("ignores tasks with untracked statuses even if they have an open pull request", () => {
    const f = makeFeature("alpha", [
      makeTask("T1", "todo", "Todo Task", {
        pr: { status: "open", url: "https://example.com/pull/1" },
      }),
      makeTask("T2", "done", "Done Task", {
        pr: { status: "OPEN", url: "https://example.com/pull/2" },
      }),
    ]);
    const sections = groupTrackedTasks([f]);
    for (const section of sections) {
      expect(section.items).toEqual([]);
    }
  });

  it("handles case-insensitive PR status", () => {
    const f = makeFeature("alpha", [
      makeTask("T1", "in_progress", "Upper case", {
        pr: { status: "OPEN", url: "https://example.com/pull/1" },
      }),
      makeTask("T2", "in_progress", "Mixed case", {
        workspace_pr: { status: "oPeN", url: "https://example.com/pull/2" },
      }),
    ]);
    const sections = groupTrackedTasks([f]);
    const inProgress = sections.find((s) => s.status === "in_progress")!;
    expect(inProgress.items.map((i) => i.task.id)).toEqual(["T1", "T2"]);
  });
});
