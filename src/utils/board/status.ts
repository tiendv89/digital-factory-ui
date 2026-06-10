export type TaskStatus = "todo" | "ready" | "in_progress" | "reviewing" | "review_passed" | "change_requested" | "review_incomplete" | "blocked" | "in_review" | "done" | "cancelled";

export type FeatureStatus = "in_design" | "in_tdd" | "ready_for_implementation" | "in_implementation" | "in_handoff" | "done" | "blocked" | "cancelled";

export type StatusColumn = {
  key: TaskStatus;
  label: string;
  color: string;
};

export type FeatureStatusOption = {
  key: FeatureStatus;
  label: string;
  color: string;
};

// Task Mode kanban allowlist — canonical order per product spec.
// T2 (kanban column wiring) and T3 (filter wiring) consume TASK_MODE_STATUSES directly.
export const TASK_MODE_STATUSES: TaskStatus[] = ["todo", "ready", "in_progress", "blocked", "in_review", "reviewing", "done", "cancelled"];

// Colors mirror the Figma board frame (122:70) exactly.
export const STATUS_COLUMNS: StatusColumn[] = [
  { key: "todo", label: "Todo", color: "#8d8f95" },
  { key: "ready", label: "Ready", color: "#32b3e6" },
  { key: "in_progress", label: "In progress", color: "#58b0ff" },
  { key: "blocked", label: "Blocked", color: "#f14d4c" },
  { key: "in_review", label: "In review", color: "#cda629" },
  { key: "reviewing", label: "In reviewing", color: "#7472f4" },
  { key: "done", label: "Done", color: "#45b164" },
  { key: "cancelled", label: "Cancelled", color: "#6e6e6e" },
];

export const STATUS_COLOR: Record<string, string> = Object.fromEntries(STATUS_COLUMNS.map((c) => [c.key, c.color]));

export const NEXT_ACTIONS: Record<string, string> = {
  todo: "Auto-ready when last dependency is done",
  ready: "Start implementation",
  in_progress: "Waiting for result",
  reviewing: "Agent is reviewing the result",
  blocked: "Human resolves",
  in_review: "Human approves or rejects",
  done: "",
  cancelled: "Do nothing",
};

export function getStatusColor(status: string): string {
  return STATUS_COLOR[status] ?? "#8892b5";
}

export function getNextAction(status: string): string {
  return NEXT_ACTIONS[status] ?? "";
}

const FEATURE_STATUS_LABELS: Record<string, string> = {
  in_design: "In Design",
  in_tdd: "In TDD",
  ready_for_implementation: "Ready",
  in_implementation: "In Progress",
  in_handoff: "Handoff",
  done: "Done",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

const FEATURE_STATUS_COLORS: Record<string, string> = {
  in_design: "#32b3e6",
  in_tdd: "#7472f4",
  ready_for_implementation: "#4fc3f7",
  in_implementation: "#58b0ff",
  in_handoff: "#cda629",
  done: "#45b164",
  blocked: "#f14d4c",
  cancelled: "#6e6e6e",
};

export const FEATURE_STATUS_OPTIONS: FeatureStatusOption[] = [
  { key: "in_design", label: "In Design", color: "#32b3e6" },
  { key: "in_tdd", label: "In TDD", color: "#7472f4" },
  { key: "ready_for_implementation", label: "Ready", color: "#4fc3f7" },
  { key: "in_implementation", label: "In Progress", color: "#58b0ff" },
  { key: "in_handoff", label: "Handoff", color: "#cda629" },
  { key: "done", label: "Done", color: "#45b164" },
  { key: "blocked", label: "Blocked", color: "#f14d4c" },
  { key: "cancelled", label: "Cancelled", color: "#6e6e6e" },
];

// Feature Mode kanban allowlist — canonical order per product spec.
// T2 (kanban column wiring) and T3 (filter wiring) consume FEATURE_MODE_STATUSES directly.
export const FEATURE_MODE_STATUSES: FeatureStatus[] = ["in_design", "in_tdd", "ready_for_implementation", "in_implementation", "in_handoff", "done", "blocked", "cancelled"];

const TASK_STATUS_LABELS: Record<string, string> = Object.fromEntries(STATUS_COLUMNS.map((c) => [c.key, c.label]));

export function getTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

const VALID_FEATURE_STATUSES = new Set<string>(["in_design", "in_tdd", "ready_for_implementation", "in_implementation", "in_handoff", "done", "blocked", "cancelled"]);

export function isValidFeatureStatus(status: string): status is FeatureStatus {
  return VALID_FEATURE_STATUSES.has(status);
}

export function normalizeFeatureStatus(status: string): FeatureStatus {
  return isValidFeatureStatus(status) ? status : "in_design";
}

export function getFeatureStatusLabel(status: string): string {
  return FEATURE_STATUS_LABELS[status] ?? "Unknown";
}

export function getFeatureStatusColor(status: string): string {
  return FEATURE_STATUS_COLORS[status] ?? "#8892b5";
}

const FEATURE_NEXT_ACTION_PRIORITY: TaskStatus[] = ["blocked", "reviewing", "in_review", "in_progress", "ready", "todo"];

export function getFeatureNextAction(tasks: Array<{ status: string }>): string | null {
  for (const status of FEATURE_NEXT_ACTION_PRIORITY) {
    if (tasks.some((t) => t.status === status)) {
      return NEXT_ACTIONS[status] ?? null;
    }
  }
  return null;
}

const CLIENT_TASK_STATUS_LABELS: Record<string, string> = {
  todo: "Not started",
  ready: "Ready",
  in_progress: "In progress",
  in_review: "In review",
  reviewing: "In Reviewing",
  review_passed: "In review",
  change_requested: "Revisions in progress",
  review_incomplete: "In review",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

const CLIENT_FEATURE_STATUS_LABELS: Record<string, string> = {
  in_design: "In design",
  in_tdd: "Technical design",
  ready_for_implementation: "Ready to build",
  in_implementation: "Building",
  in_handoff: "Handoff",
  done: "Done",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

export function clientStatusLabel(status: string): string {
  return CLIENT_TASK_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function clientFeatureStatusLabel(status: string): string {
  return CLIENT_FEATURE_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}
