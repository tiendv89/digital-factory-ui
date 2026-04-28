import { formatDistanceToNow } from "@/lib/date-utils";

export interface ActivityEntry {
  id: string;
  type: "feature" | "task";
  action: string;
  subject: string;
  subjectId: string;
  by: string;
  at: string;
  note?: string | null;
}

interface RecentActivityProps {
  entries: ActivityEntry[];
}

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  approved: "Approved",
  rejected: "Rejected",
  reset: "Reset",
  started: "Started",
  claimed: "Claimed",
  ready: "Ready",
  done: "Done",
  blocked: "Blocked",
  in_review: "In review",
  cancelled: "Cancelled",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function typeLabel(type: "feature" | "task"): string {
  return type === "feature" ? "Feature" : "Task";
}

export function RecentActivity({ entries }: RecentActivityProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
        <h2 className="mb-4 text-sm font-semibold text-(--color-text-primary)">
          Recent Activity
        </h2>
        <p className="text-sm text-(--color-text-muted)">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
      <h2 className="mb-4 text-sm font-semibold text-(--color-text-primary)">
        Recent Activity
      </h2>
      <ol className="space-y-0 divide-y divide-(--color-border)">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className={[
                "mt-0.5 inline-flex h-5 min-w-[40px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold uppercase tracking-wide shrink-0",
                entry.type === "feature"
                  ? "bg-(--color-primary-light) text-(--color-primary)"
                  : "bg-(--color-surface-secondary) text-(--color-text-muted) border border-(--color-border)",
              ].join(" ")}
              style={
                entry.type === "feature"
                  ? { backgroundColor: "rgba(84,101,232,0.08)" }
                  : undefined
              }
            >
              {typeLabel(entry.type)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-(--color-text-primary) leading-snug">
                <span className="font-medium">{actionLabel(entry.action)}</span>
                {" — "}
                <span className="text-(--color-text-secondary)">{entry.subject}</span>
              </p>
              {entry.note && (
                <p className="mt-0.5 text-xs text-(--color-text-muted) truncate">
                  {entry.note}
                </p>
              )}
              <p className="mt-0.5 text-xs text-(--color-text-muted)">
                <span>{entry.by}</span>
                <span className="mx-1">·</span>
                <time dateTime={entry.at} title={entry.at}>
                  {formatDistanceToNow(entry.at)}
                </time>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
