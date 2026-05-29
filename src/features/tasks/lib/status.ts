export type StatusBadgeStyle = {
  bg: string;
  text: string;
  dot: string;
};

const STATUS_STYLES: Record<string, StatusBadgeStyle> = {
  todo: {
    bg: "bg-muted-bg",
    text: "text-text-secondary",
    dot: "bg-text-muted",
  },
  ready: {
    bg: "bg-ready-bg",
    text: "text-ready",
    dot: "bg-ready",
  },
  in_progress: {
    bg: "bg-warning-bg",
    text: "text-warning",
    dot: "bg-warning",
  },
  reviewing: {
    bg: "bg-info-bg",
    text: "text-info",
    dot: "bg-info",
  },
  blocked: {
    bg: "bg-danger-bg",
    text: "text-danger",
    dot: "bg-danger",
  },
  in_review: {
    bg: "bg-purple-bg",
    text: "text-purple",
    dot: "bg-purple",
  },
  done: {
    bg: "bg-success-bg",
    text: "text-success",
    dot: "bg-success",
  },
  cancelled: {
    bg: "bg-muted-bg",
    text: "text-text-muted",
    dot: "bg-text-muted",
  },
};

export function getStatusStyle(status: string): StatusBadgeStyle {
  return STATUS_STYLES[status] ?? STATUS_STYLES["todo"];
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

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

export function getNextActionLabel(status: string): string | undefined {
  return NEXT_ACTIONS[status];
}
