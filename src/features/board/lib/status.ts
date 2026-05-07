export type TaskStatus =
  | "todo"
  | "ready"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "done"
  | "cancelled";

export type StatusColumn = {
  key: TaskStatus;
  label: string;
  color: string;
};

export const STATUS_COLUMNS: StatusColumn[] = [
  { key: "todo", label: "TODO", color: "#3274b4" },
  { key: "ready", label: "READY", color: "#6e6de7" },
  { key: "in_progress", label: "IN PROGRESS", color: "#e08500" },
  { key: "blocked", label: "BLOCKED", color: "#e62a34" },
  { key: "in_review", label: "IN REVIEW", color: "#8e67cb" },
  { key: "done", label: "DONE", color: "#009252" },
  { key: "cancelled", label: "CANCELLED", color: "#5c636e" },
];

export const STATUS_COLOR: Record<string, string> = Object.fromEntries(
  STATUS_COLUMNS.map((c) => [c.key, c.color]),
);

export const NEXT_ACTIONS: Record<string, string> = {
  todo: "Auto-ready when last dependency is done",
  ready: "Start implementation",
  in_progress: "Waiting for result",
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

export function getStatusLabel(status: string): string {
  return STATUS_COLUMNS.find((c) => c.key === status)?.label ?? status.toUpperCase().replace(/_/g, " ");
}

const FEATURE_STATUS_LABELS: Record<string, string> = {
  in_design: "In Design",
  in_tdd: "In TDD",
  ready_for_implementation: "Ready",
  in_implementation: "In Progress",
  in_handoff: "In Handoff",
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

export function getFeatureStatusLabel(status: string): string {
  return FEATURE_STATUS_LABELS[status] ?? status;
}

export function getFeatureStatusColor(status: string): string {
  return FEATURE_STATUS_COLORS[status] ?? "#8892b5";
}

const FEATURE_NEXT_ACTION_PRIORITY: TaskStatus[] = [
  "blocked",
  "in_review",
  "in_progress",
  "ready",
  "todo",
];

export function getFeatureNextAction(tasks: Array<{ status: string }>): string | null {
  for (const status of FEATURE_NEXT_ACTION_PRIORITY) {
    if (tasks.some((t) => t.status === status)) {
      return NEXT_ACTIONS[status] ?? null;
    }
  }
  return null;
}
