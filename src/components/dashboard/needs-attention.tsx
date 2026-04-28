import Link from "next/link";

const STATUS_CONFIG = {
  blocked: {
    borderColor: "#ff5e7d",
    badgeBg: "#fce4e9",
    badgeColor: "#e04865",
    label: "Blocked",
  },
  in_review: {
    borderColor: "#ffb547",
    badgeBg: "#fbefd9",
    badgeColor: "#b3741a",
    label: "In Review",
  },
} as const;

export interface AttentionTask {
  taskId: string;
  taskTitle: string;
  featureId: string;
  repo: string;
  status: "blocked" | "in_review";
}

interface NeedsAttentionProps {
  items: AttentionTask[];
}

export function NeedsAttention({ items }: NeedsAttentionProps) {
  return (
    <div className="flex flex-col gap-4 col-span-1">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[16px] font-semibold leading-6 tracking-[-0.31px] text-text-primary">
            Needs Attention
          </h2>
          <p className="text-[13px] leading-[19.5px] text-text-secondary">
            Blocked or in review
          </p>
        </div>
        <Link href="/features" className="text-[13px] font-medium leading-[19.5px] text-primary">
          View all →
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-text-muted">No tasks need attention.</p>
        ) : (
          items.map(item => {
            const cfg = STATUS_CONFIG[item.status];
            return (
              <div
                key={`${item.featureId}-${item.taskId}`}
                className="relative overflow-hidden rounded-[10px] border border-border bg-surface shadow-[0px_1px_2px_0px_rgba(16,24,40,0.04)]"
              >
                <div
                  className="absolute bottom-0 left-0 top-0 w-[3px]"
                  style={{ backgroundColor: cfg.borderColor }}
                />
                <div className="py-[17px] pl-[19px] pr-3">
                  <span className="rounded-[4px] bg-[#f3f4f9] px-[6px] font-mono text-[10px] leading-[15px] text-text-muted">
                    {item.featureId}
                  </span>
                  <p className="mt-[9px] font-mono text-[12px] leading-[18px] text-text-secondary">
                    {item.taskId}
                  </p>
                  <p className="mt-1 truncate text-[14px] leading-5 text-text-primary">
                    {item.taskTitle}
                  </p>
                  <div className="mt-[10px] flex items-center justify-between">
                    <span className="rounded-[4px] border border-border px-[6px] py-[1px] text-[11px] leading-[16.5px] text-text-secondary">
                      {item.repo}
                    </span>
                    <span
                      className="rounded-full px-2 text-[11px] font-medium uppercase tracking-[0.55px] leading-5"
                      style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeColor }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
