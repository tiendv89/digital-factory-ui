import { describe, expect, it } from "vitest";

import type { FeatureSummary, TaskSummary, WorkspaceDetail } from "@/services/workflow-backend/types";
import { adaptWorkspaceDetail } from "@/utils/workspaces/workspace-adapter";

const taskCounts = { total: 0, done: 0, in_progress: 0, blocked: 0, ready: 0, todo: 0 };

function feature(over: Partial<FeatureSummary>): FeatureSummary {
  return {
    id: "surrogate-uuid",
    feature_id: "VOY2-60",
    feature_name: "VOY2-60",
    title: "Unified support launcher",
    status: "ready_for_implementation",
    current_stage: "ready_for_implementation",
    updated_at: "2026-06-24T00:00:00Z",
    task_counts: taskCounts,
    init_pr_merged: false,
    ...over,
  };
}

function task(over: Partial<TaskSummary>): TaskSummary {
  return {
    id: "task-uuid",
    task_id: "T1",
    task_name: "T1",
    feature_id: "VOY2-60",
    feature_name: "VOY2-60",
    title: "Build SupportLauncher UI",
    status: "todo",
    repo: "voyager-interface",
    branch: "feature/VOY2-60",
    is_blocked: false,
    ...over,
  };
}

function detail(features: FeatureSummary[], tasks: TaskSummary[]): WorkspaceDetail {
  return { features, tasks } as unknown as WorkspaceDetail;
}

describe("adaptWorkspaceDetail — task association by feature_id", () => {
  it("associates tasks when the surrogate id diverges from feature_id (UI-created feature)", () => {
    // VOY2-60: surrogate id is a UUID, business key is "VOY2-60" — they differ.
    const f = feature({ id: "0f9a-uuid-2c1b", feature_id: "VOY2-60" });
    const tasks = [task({ task_name: "T1", feature_id: "VOY2-60" }), task({ task_name: "T2", feature_id: "VOY2-60" })];

    const [parsed] = adaptWorkspaceDetail(detail([f], tasks));

    expect(parsed.tasks).toHaveLength(2);
    expect(parsed.tasks.map((t) => t.id)).toEqual(["T1", "T2"]);
  });

  it("still associates tasks when id equals feature_id (imported feature)", () => {
    const f = feature({ id: "FARO-799", feature_id: "FARO-799" });
    const tasks = [task({ task_id: "T1", feature_id: "FARO-799" })];

    const [parsed] = adaptWorkspaceDetail(detail([f], tasks));

    expect(parsed.tasks).toHaveLength(1);
  });

  it("does not cross-associate tasks from a different feature", () => {
    const f = feature({ id: "uuid-a", feature_id: "VOY2-60" });
    const tasks = [task({ feature_id: "VOY2-60" }), task({ task_id: "T9", feature_id: "FARO-799" })];

    const [parsed] = adaptWorkspaceDetail(detail([f], tasks));

    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].id).toBe("T1");
  });
});
