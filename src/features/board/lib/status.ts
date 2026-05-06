export const STATUS_KEYS = [
  "todo",
  "ready",
  "in_progress",
  "blocked",
  "in_review",
  "done",
  "cancelled",
] as const;

export type StatusKey = (typeof STATUS_KEYS)[number];

export const STATUS_LABEL: Record<StatusKey, string> = {
  todo: "TODO",
  ready: "READY",
  in_progress: "IN PROGRESS",
  blocked: "BLOCKED",
  in_review: "IN REVIEW",
  done: "DONE",
  cancelled: "CANCELLED",
};

export const STATUS_NEXT_ACTION: Record<StatusKey, string> = {
  todo: "Awaiting dependencies",
  ready: "Ready to start",
  in_progress: "Continue implementation",
  blocked: "Resolve blocker",
  in_review: "Awaiting review",
  done: "Complete",
  cancelled: "Cancelled",
};

export type StatusToneTokens = {
  dot: string;
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  segment: string;
};

export const STATUS_TONE: Record<StatusKey, StatusToneTokens> = {
  todo: {
    dot: "bg-text-muted",
    badgeBg: "bg-muted-bg",
    badgeText: "text-text-secondary",
    cardBorder: "border-l-text-muted",
    segment: "bg-text-muted",
  },
  ready: {
    dot: "bg-ready",
    badgeBg: "bg-ready-bg",
    badgeText: "text-ready",
    cardBorder: "border-l-ready",
    segment: "bg-ready",
  },
  in_progress: {
    dot: "bg-primary",
    badgeBg: "bg-primary-light",
    badgeText: "text-primary",
    cardBorder: "border-l-primary",
    segment: "bg-primary",
  },
  blocked: {
    dot: "bg-danger",
    badgeBg: "bg-danger-bg",
    badgeText: "text-danger",
    cardBorder: "border-l-danger",
    segment: "bg-danger",
  },
  in_review: {
    dot: "bg-warning",
    badgeBg: "bg-warning-bg",
    badgeText: "text-warning",
    cardBorder: "border-l-warning",
    segment: "bg-warning",
  },
  done: {
    dot: "bg-success",
    badgeBg: "bg-success-bg",
    badgeText: "text-success",
    cardBorder: "border-l-success",
    segment: "bg-success",
  },
  cancelled: {
    dot: "bg-text-muted",
    badgeBg: "bg-muted-bg",
    badgeText: "text-text-muted",
    cardBorder: "border-l-text-muted",
    segment: "bg-text-muted",
  },
};

const KNOWN: ReadonlySet<string> = new Set(STATUS_KEYS);

export function normalizeStatus(status: string | null | undefined): StatusKey {
  if (status && KNOWN.has(status)) {
    return status as StatusKey;
  }
  return "todo";
}
