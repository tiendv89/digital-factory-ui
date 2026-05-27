import { describe, it, expect } from "vitest";
import {
  adaptTaskDetail,
  adaptTaskSummariesToFeatures,
  adaptFeatureSummaries,
} from "../features/workspaces/lib/workspaceAdapter";
import type {
  TaskDetail,
  TaskSummary,
  FeatureSummary,
} from "../services/workflow-backend/types";

function makeTask(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "task-uuid-1",
    task_id: "T1",
    task_name: "T1",
    feature_id: "feat-uuid-1",
    feature_name: "auth-feature",
    title: "Implement auth",
    status: "in_progress",
    repo: "my-repo",
    branch: "feature/auth-T1",
    is_blocked: false,
    pr: null,
    workspace_pr: null,
    ...overrides,
  };
}

function makeFeatureSummary(overrides: Partial<FeatureSummary> = {}): FeatureSummary {
  return {
    id: "feat-uuid-1",
    feature_id: "feat-uuid-1",
    feature_name: "auth-feature",
    title: "Authentication",
    status: "in_implementation",
    current_stage: "in_implementation",
    updated_at: "2026-01-01T00:00:00Z",
    task_counts: { total: 2, done: 0, in_progress: 1, blocked: 0, ready: 1, todo: 0 },
    ...overrides,
  };
}

describe("adaptTaskSummariesToFeatures", () => {
  it("returns empty array for empty input", () => {
    expect(adaptTaskSummariesToFeatures([])).toEqual([]);
  });

  it("groups tasks by feature_id into ParsedFeature[]", () => {
    const tasks: TaskSummary[] = [
      makeTask({ feature_id: "feat-1", feature_name: "feat-one", task_name: "T1" }),
      makeTask({ feature_id: "feat-2", feature_name: "feat-two", task_name: "T2", id: "task-2" }),
      makeTask({ feature_id: "feat-1", feature_name: "feat-one", task_name: "T3", id: "task-3" }),
    ];

    const features = adaptTaskSummariesToFeatures(tasks);
    expect(features).toHaveLength(2);

    const featOne = features.find((f) => f.id === "feat-one");
    const featTwo = features.find((f) => f.id === "feat-two");

    expect(featOne).toBeDefined();
    expect(featTwo).toBeDefined();
    expect(featOne!.tasks).toHaveLength(2);
    expect(featTwo!.tasks).toHaveLength(1);
  });

  it("preserves insertion order of features", () => {
    const tasks: TaskSummary[] = [
      makeTask({ feature_id: "b", feature_name: "B", id: "t-b1" }),
      makeTask({ feature_id: "a", feature_name: "A", id: "t-a1" }),
    ];
    const features = adaptTaskSummariesToFeatures(tasks);
    expect(features[0].id).toBe("B");
    expect(features[1].id).toBe("A");
  });

  it("maps TaskSummary fields to ParsedTask correctly", () => {
    const task = makeTask({
      task_name: "T2",
      title: "Build dashboard",
      status: "in_review",
      branch: "feature/dashboard-T2",
      is_blocked: false,
      pr: { label: "PR #10", status: "open", repo: "my-repo", url: "https://github.com/x/y/pull/10" },
    });
    const features = adaptTaskSummariesToFeatures([task]);
    const parsedTask = features[0].tasks[0];
    expect(parsedTask.id).toBe("T2");
    expect(parsedTask.title).toBe("Build dashboard");
    expect(parsedTask.status).toBe("in_review");
    expect(parsedTask.branch).toBe("feature/dashboard-T2");
    expect(parsedTask.pr?.url).toBe("https://github.com/x/y/pull/10");
  });

  it("does NOT derive featureStatus from task statuses — returns 'unknown'", () => {
    const task = makeTask();
    const features = adaptTaskSummariesToFeatures([task]);
    expect(features[0].featureStatus).toBe("unknown");
  });

  it("falls back to feature_name when feature_id is missing", () => {
    const task = makeTask({ feature_id: "", feature_name: "fallback-feat" });
    const features = adaptTaskSummariesToFeatures([task]);
    expect(features[0].id).toBe("fallback-feat");
  });
});

describe("adaptFeatureSummaries", () => {
  it("returns empty array for empty input", () => {
    expect(adaptFeatureSummaries([])).toEqual([]);
  });

  it("maps FeatureSummary to ParsedFeature with empty tasks", () => {
    const fs = makeFeatureSummary({ feature_name: "auth-feature", status: "in_design" });
    const features = adaptFeatureSummaries([fs]);
    expect(features).toHaveLength(1);
    expect(features[0].id).toBe("auth-feature");
    expect(features[0].featureStatus).toBe("in_design");
    expect(features[0].tasks).toEqual([]);
  });

  it("preserves all features from input", () => {
    const summaries = [
      makeFeatureSummary({ feature_name: "feat-a", id: "id-a" }),
      makeFeatureSummary({ feature_name: "feat-b", id: "id-b" }),
      makeFeatureSummary({ feature_name: "feat-c", id: "id-c" }),
    ];
    const result = adaptFeatureSummaries(summaries);
    expect(result).toHaveLength(3);
    expect(result.map((f) => f.id)).toEqual(["feat-a", "feat-b", "feat-c"]);
  });
});

describe("adaptTaskDetail", () => {
  it("tolerates task detail payloads without pr_refs or legacy PR fields", () => {
    const task = {
      id: "task-uuid-1",
      task_id: "task-uuid-1",
      task_name: "T1",
      feature_id: "feat-uuid-1",
      feature_name: "auth-feature",
      title: "Implement auth detail",
      status: "ready",
      repo: "my-repo",
      branch: "feature/auth-T1",
      is_blocked: false,
      next_action: "Start implementation",
      blocked_reason: "",
      workspace_id: "ws-1",
      depends_on: [],
      execution: { actor_type: "agent" },
      activity: [
        {
          action: "ready",
          scope: "task",
          actor: "alice",
          occurred_at: "2026-05-15T07:13:22Z",
          note: "Task activated",
          feature_id: "feat-uuid-1",
          task_id: "task-uuid-1",
        },
      ],
    } as unknown as TaskDetail;

    const parsed = adaptTaskDetail(task);

    expect(parsed.id).toBe("T1");
    expect(parsed.pr).toBeUndefined();
    expect(parsed.workspace_pr).toBeUndefined();
    expect(parsed.log).toEqual([
      {
        action: "ready",
        by: "alice",
        at: "2026-05-15T07:13:22Z",
        note: "Task activated",
      },
    ]);
  });
});
