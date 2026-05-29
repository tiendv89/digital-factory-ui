export type TaskStatus =
  | "todo"
  | "ready"
  | "in_progress"
  | "reviewing"
  | "blocked"
  | "in_review"
  | "done"
  | "cancelled";

export type FeatureStatus =
  | "in_design"
  | "in_tdd"
  | "ready_for_implementation"
  | "in_implementation"
  | "in_handoff"
  | "done"
  | "blocked"
  | "cancelled";

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

export const STATUS_COLUMNS: StatusColumn[] = [
  { key: "todo", label: "Todo", color: "#3274b4" },
  { key: "ready", label: "Ready", color: "#6e6de7" },
  { key: "in_progress", label: "In Progress", color: "#e08500" },
  { key: "reviewing", label: "In Reviewing", color: "#b45fbd" },
  { key: "blocked", label: "Blocked", color: "#e62a34" },
  { key: "in_review", label: "In Review", color: "#8e67cb" },
  { key: "done", label: "Done", color: "#009252" },
  { key: "cancelled", label: "Cancelled", color: "#5c636e" },
];

export const STATUS_COLOR: Record<string, string> = Object.fromEntries(
  STATUS_COLUMNS.map((c) => [c.key, c.color]),
);

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
  in_design: "#3274b4",
  in_tdd: "#3274b4",
  ready_for_implementation: "#6e6de7",
  in_implementation: "#e08500",
  in_handoff: "#8e67cb",
  done: "#009252",
  blocked: "#e62a34",
  cancelled: "#5c636e",
};

export const FEATURE_STATUS_OPTIONS: FeatureStatusOption[] = [
  { key: "in_design", label: "In Design", color: "#3274b4" },
  { key: "in_tdd", label: "In TDD", color: "#3274b4" },
  { key: "ready_for_implementation", label: "Ready", color: "#6e6de7" },
  { key: "in_implementation", label: "In Progress", color: "#e08500" },
  { key: "in_handoff", label: "Handoff", color: "#8e67cb" },
  { key: "done", label: "Done", color: "#009252" },
  { key: "blocked", label: "Blocked", color: "#e62a34" },
  { key: "cancelled", label: "Cancelled", color: "#5c636e" },
];

const VALID_FEATURE_STATUSES = new Set<string>([
  "in_design",
  "in_tdd",
  "ready_for_implementation",
  "in_implementation",
  "in_handoff",
  "done",
  "blocked",
  "cancelled",
]);

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

const FEATURE_NEXT_ACTION_PRIORITY: TaskStatus[] = [
  "blocked",
  "reviewing",
  "in_review",
  "in_progress",
  "ready",
  "todo",
];

export function getFeatureNextAction(
  tasks: Array<{ status: string }>,
): string | null {
  for (const status of FEATURE_NEXT_ACTION_PRIORITY) {
    if (tasks.some((t) => t.status === status)) {
      return NEXT_ACTIONS[status] ?? null;
    }
  }
  return null;
}
