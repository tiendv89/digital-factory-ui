export type TaskStatus = "todo" | "ready" | "in_progress" | "reviewing" | "review_passed" | "change_requested" | "review_incomplete" | "blocked" | "in_review" | "done" | "cancelled";

export type FeatureStatus = "in_design" | "in_tdd" | "ready_for_implementation" | "in_implementation" | "in_handoff" | "done" | "blocked" | "cancelled";

export const TASK_MODE_STATUSES: TaskStatus[] = ["todo", "ready", "in_progress", "blocked", "in_review", "reviewing", "done", "cancelled"];

export const FEATURE_MODE_STATUSES: FeatureStatus[] = ["in_design", "in_tdd", "ready_for_implementation", "in_implementation", "in_handoff", "done", "blocked", "cancelled"];
