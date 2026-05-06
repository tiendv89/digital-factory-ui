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

const FALLBACK: StatusBadgeStyle = {
  bg: "bg-muted-bg",
  text: "text-text-secondary",
  dot: "bg-text-muted",
};

export function getStatusStyle(status: string): StatusBadgeStyle {
  return STATUS_STYLES[status] ?? FALLBACK;
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}
