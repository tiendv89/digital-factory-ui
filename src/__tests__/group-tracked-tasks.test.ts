import { describe, it, expect } from "vitest";
import { groupTrackedTasks } from "../features/board/components/TaskTrackingPanel/groupTasks";
import { TRACKED_SECTIONS } from "../features/board/components/TaskTrackingPanel/TaskTrackingPanel.types";
import type { ParsedFeature, ParsedTask } from "../services/yaml-parser";

const makeTask = (
  id: string,
  status: string,
  title = `Task ${id}`,
): ParsedTask => ({
  id,
  title,
  status,
  dependsOn: [],
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
      makeTask("T1", "in_progress"),
      makeTask("T2", "ready"),
      makeTask("T3", "done"),
    ]);
    const f2 = makeFeature("beta", [
      makeTask("T1", "in_review"),
      makeTask("T2", "ready"),
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
    const f = makeFeature("alpha", [makeTask("T1", "in_progress")]);
    const sections = groupTrackedTasks([f]);
    const inProgress = sections.find((s) => s.status === "in_progress")!;
    expect(inProgress.items).toHaveLength(1);
    expect(inProgress.items[0].feature).toBe(f);
    expect(inProgress.items[0].task.id).toBe("T1");
  });
});
