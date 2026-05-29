import type { LogEntry, ParsedFeature, ParsedTask } from "@/services/yaml-parser";

const STATUS_TO_LOG_ACTIONS: Record<string, readonly string[]> = {
  blocked: ["blocked"],
  in_progress: ["in_progress", "started", "claimed"],
  ready: ["ready"],
  in_review: ["in_review", "moved_to_review"],
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function findStatusLogEntry(
  log: LogEntry[] | undefined,
  status: string,
): LogEntry | null {
  if (!log || log.length === 0) return null;
  const actions = STATUS_TO_LOG_ACTIONS[status];
  if (!actions) return null;

  for (let i = log.length - 1; i >= 0; i--) {
    const entry = log[i];
    if (actions.includes(entry.action)) return entry;
  }
  return null;
}

const MINUTE_MS = 60 * 1000;

export function formatStatusAgeDuration(elapsedMs: number): string {
  if (elapsedMs < 0) return "—";

  if (elapsedMs < MINUTE_MS) {
    const secs = Math.floor(elapsedMs / 1000);
    return `${secs}s`;
  }
  if (elapsedMs < HOUR_MS) {
    const mins = Math.floor(elapsedMs / MINUTE_MS);
    return `${mins}m`;
  }
  if (elapsedMs < DAY_MS) {
    const hours = Math.floor(elapsedMs / HOUR_MS);
    return `${hours}h`;
  }
  const days = Math.floor(elapsedMs / DAY_MS);
  return `${days}d`;
}

/** Compact last-updated label reading exclusively from execution.last_updated_at. */
export function computeLastUpdatedLabel(
  task: Pick<ParsedTask, "execution">,
  now: Date = new Date(),
): string | null {
  const iso = task.execution?.last_updated_at;
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const elapsed = now.getTime() - ms;
  return formatLastUpdatedLabel(elapsed);
}

/** Formats elapsed milliseconds as a compact human-readable "… ago" label. */
export function formatLastUpdatedLabel(elapsedMs: number): string {
  if (elapsedMs < 0) return "—";
  if (elapsedMs < MINUTE_MS) {
    const secs = Math.floor(elapsedMs / 1000);
    return `${secs}s ago`;
  }
  if (elapsedMs < HOUR_MS) {
    const mins = Math.floor(elapsedMs / MINUTE_MS);
    return `${mins}m ago`;
  }
  if (elapsedMs < DAY_MS) {
    const hours = Math.floor(elapsedMs / HOUR_MS);
    return `${hours}h ago`;
  }
  const days = Math.floor(elapsedMs / DAY_MS);
  return `${days}d ago`;
}

export function computeStatusAge(
  task: Pick<ParsedTask, "status" | "log" | "execution">,
  now: Date = new Date(),
): string {
  const entry = findStatusLogEntry(task.log, task.status);
  let atMs: number | null = null;

  if (entry) {
    const ms = new Date(entry.at).getTime();
    if (!Number.isNaN(ms)) atMs = ms;
  }

  if (atMs === null && task.log && task.log.length > 0) {
    for (let i = task.log.length - 1; i >= 0; i--) {
      const ms = new Date(task.log[i].at).getTime();
      if (!Number.isNaN(ms)) {
        atMs = ms;
        break;
      }
    }
  }

  if (atMs === null && task.execution?.last_updated_at) {
    const ms = new Date(task.execution.last_updated_at).getTime();
    if (!Number.isNaN(ms)) atMs = ms;
  }

  if (atMs === null) return "—";

  const elapsed = now.getTime() - atMs;
  return formatStatusAgeDuration(elapsed);
}

export function formatElapsed(elapsedMs: number): string {
  if (elapsedMs < 0) return "—";

  if (elapsedMs < DAY_MS) {
    const hours = Math.floor(elapsedMs / HOUR_MS);
    const minutes = Math.floor((elapsedMs - hours * HOUR_MS) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  }

  const days = Math.floor(elapsedMs / DAY_MS);
  const hours = Math.floor((elapsedMs - days * DAY_MS) / HOUR_MS);
  return `${days}d ${hours}h`;
}

export function getElapsedSinceStatus(
  task: Pick<ParsedTask, "status" | "log">,
  now: Date = new Date(),
): string {
  const entry = findStatusLogEntry(task.log, task.status);
  if (!entry) return "—";

  const at = new Date(entry.at).getTime();
  if (Number.isNaN(at)) return "—";

  const elapsed = now.getTime() - at;
  if (elapsed < 0) return "—";

  return formatElapsed(elapsed);
}

function latestValidIsoTimestamp(
  current: string | null,
  candidate: string | undefined,
): string | null {
  if (!candidate) return current;
  const candidateTime = new Date(candidate).getTime();
  if (Number.isNaN(candidateTime)) return current;
  if (!current) return candidate;

  const currentTime = new Date(current).getTime();
  return candidateTime > currentTime ? candidate : current;
}

export function getFeatureLastModifiedAt(feature: ParsedFeature): string | null {
  let latest: string | null = null;

  for (const task of feature.tasks) {
    latest = latestValidIsoTimestamp(
      latest,
      task.execution?.last_updated_at,
    );

    for (const entry of task.log ?? []) {
      latest = latestValidIsoTimestamp(latest, entry.at);
    }
  }

  return latest;
}

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return TIMESTAMP_FORMATTER.format(date).replace(",", "");
}

export function isTodayTimestamp(iso: string, now: Date = new Date()): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
