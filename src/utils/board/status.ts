export type TaskStatus = "todo" | "ready" | "in_progress" | "reviewing" | "review_passed" | "change_requested" | "review_incomplete" | "blocked" | "in_review" | "done" | "cancelled";

export type FeatureStatus = "in_design" | "in_tdd" | "ready_for_implementation" | "in_implementation" | "in_handoff" | "done" | "blocked" | "cancelled";

// Task Mode kanban allowlist — canonical order per product spec.
// T2 (kanban column wiring) and T3 (filter wiring) consume TASK_MODE_STATUSES directly.
export const TASK_MODE_STATUSES: TaskStatus[] = ["todo", "ready", "in_progress", "blocked", "in_review", "reviewing", "done", "cancelled"];

// Feature Mode kanban allowlist — canonical order per product spec.
// T2 (kanban column wiring) and T3 (filter wiring) consume FEATURE_MODE_STATUSES directly.
export const FEATURE_MODE_STATUSES: FeatureStatus[] = ["in_design", "in_tdd", "ready_for_implementation", "in_implementation", "in_handoff", "done", "blocked", "cancelled"];
