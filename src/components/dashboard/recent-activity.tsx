import { formatDistanceToNow } from "@/lib/date-utils";
import type { ActivityEntry } from "@/types/activity";

function getInitials(name: string): string {
  return name
    .split(/[\s._@-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
}

const ACTION_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  created:   { label: "Created",        bg: "#eef0f6", color: "#5a6380" },
  approved:  { label: "Approved",       bg: "#e0f7ee", color: "#17a674" },
  rejected:  { label: "Rejected",       bg: "#fce4e9", color: "#e04865" },
  reset:     { label: "Reset",          bg: "#eef0f6", color: "#5a6380" },
  started:   { label: "Started",        bg: "rgba(84,101,232,0.1)", color: "#5465e8" },
  claimed:   { label: "Claimed",        bg: "rgba(84,101,232,0.1)", color: "#5465e8" },
  ready:     { label: "Ready",          bg: "#e3f2fb", color: "#2595cc" },
  done:      { label: "Done",           bg: "#e0f7ee", color: "#17a674" },
  blocked:   { label: "Blocked",        bg: "#fce4e9", color: "#e04865" },
  in_review:          { label: "In Review",          bg: "#fbefd9", color: "#b3741a" },
  cancelled:          { label: "Cancelled",          bg: "#eef0f6", color: "#8892b5" },
  comments_addressed: { label: "Comments Addressed", bg: "rgba(84,101,232,0.1)", color: "#5465e8" },
  review_started:     { label: "Review Started",     bg: "#fbefd9", color: "#b3741a" },
  marked_done:        { label: "Marked Done",        bg: "#e0f7ee", color: "#17a674" },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? { label: action, bg: "#eef0f6", color: "#5a6380" };
}

interface RecentActivityProps {
  entries: ActivityEntry[];
}

export function RecentActivity({ entries }: RecentActivityProps) {
  return (
    <div className="flex flex-col gap-4 col-span-2">
      <div>
        <h2 className="text-[16px] font-semibold leading-6 tracking-[-0.31px] text-text-primary">
          Recent Activity
        </h2>
        <p className="text-[13px] leading-[19.5px] text-text-secondary">
          Last {entries.length > 0 ? entries.length : 10} events across all tasks
        </p>
      </div>

      <div className="rounded-[14px] border border-border bg-surface p-5 shadow-[0px_1px_1px_rgba(16,24,40,0.04)]">
        {entries.length === 0 ? (
          <p className="py-6 text-sm text-text-muted">No recent activity.</p>
        ) : (
          <ol>
            {entries.map((entry, i) => (
              <li
                key={entry.id}
                className={[
                  "flex items-start gap-3 py-3.5",
                  i < entries.length - 1 ? "border-b border-border" : "",
                ].join(" ")}
              >
                {/* Avatar */}
                <div className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef0f6] text-[10px] font-semibold tracking-[0.12px] text-text-primary">
                  {getInitials(entry.by)}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Path header */}
                  <p className="truncate font-mono text-[11px] leading-[16.5px] text-text-muted">
                    {entry.featureId ? (
                      <>
                        <span>{entry.featureId}</span>
                        {entry.type === "task" && (
                          <>
                            <span className="mx-[6px]">/</span>
                            <span className="text-text-secondary">{entry.subjectId}</span>
                          </>
                        )}
                      </>
                    ) : (
                      entry.subjectId
                    )}
                  </p>

                  {/* Action */}
                  <div className="mt-[2px] flex items-center gap-2 overflow-hidden">
                    {(() => {
                      const cfg = getActionConfig(entry.action);
                      return (
                        <span
                          className="shrink-0 rounded-full px-2 py-px text-[10px] font-semibold uppercase tracking-[0.5px]"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      );
                    })()}
                    <span className="truncate text-[13px] leading-[19.5px] text-text-secondary">
                      {entry.subject}
                    </span>
                  </div>

                  {entry.note && (
                    <p className="mt-0.5 truncate text-[12px] leading-[18px] text-text-muted">
                      {entry.note}
                    </p>
                  )}

                  {/* Meta */}
                  <p className="mt-[2px] truncate text-[12px] leading-[18px] text-text-muted">
                    {entry.by}
                    <span className="mx-1.5">·</span>
                    <time dateTime={entry.at}>{formatDistanceToNow(entry.at)}</time>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
