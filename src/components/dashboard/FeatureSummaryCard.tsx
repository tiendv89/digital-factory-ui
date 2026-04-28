import type { LifecycleStage, StageReviewStatus } from "@/types/feature";
import { formatDistanceToNow } from "@/lib/date-utils";

const STAGE_DEFS: { key: LifecycleStage; label: string }[] = [
  { key: "product_spec", label: "Product Spec" },
  { key: "technical_design", label: "Technical Design" },
  { key: "tasks", label: "Tasks" },
  { key: "handoff", label: "Handoff" },
];

const REVIEW_BADGE: Record<StageReviewStatus, { bg: string; color: string; label: string }> = {
  awaiting_approval: { bg: "#fbefd9", color: "#b3741a", label: "Awaiting Approval" },
  draft: { bg: "#eef0f6", color: "#8892b5", label: "Draft" },
  approved: { bg: "#e0f7ee", color: "#17a674", label: "Approved" },
  rejected: { bg: "#fce4e9", color: "#e04865", label: "Rejected" },
};

export interface FeatureSummaryCardProps {
  featureId: string;
  title: string;
  currentStage: LifecycleStage;
  currentStageReviewStatus: StageReviewStatus;
  stageReviewStatuses: Partial<Record<LifecycleStage, StageReviewStatus>>;
  totalTasks: number;
  doneTasks: number;
  lastUpdatedAt: string | null;
}

export function FeatureSummaryCard({
  featureId,
  title,
  currentStage,
  currentStageReviewStatus,
  stageReviewStatuses,
  totalTasks,
  doneTasks,
  lastUpdatedAt,
}: FeatureSummaryCardProps) {
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const badge = REVIEW_BADGE[currentStageReviewStatus] ?? REVIEW_BADGE.draft;
  const currentStageLabel = STAGE_DEFS.find(s => s.key === currentStage)?.label ?? currentStage;

  return (
    <div className="relative h-[225.5px] w-[360px] shrink-0 rounded-[14px] border border-(--color-border) bg-(--color-surface) shadow-[0px_1px_1px_rgba(16,24,40,0.04)]">
      {/* Header */}
      <div className="absolute left-5 right-5 top-5">
        <p className="truncate text-[15px] font-semibold leading-[22.5px] tracking-[-0.23px] text-(--color-text-primary)">
          {title}
        </p>
        <span className="mt-[6px] inline-block rounded-[4px] bg-[#f3f4f9] px-[6px] font-mono text-[11px] leading-[16.5px] text-(--color-text-secondary)">
          {featureId}
        </span>
      </div>

      {/* Lifecycle Rail */}
      <div className="absolute left-5 right-5 top-[82.5px] flex items-start">
        {STAGE_DEFS.map((stage, i) => {
          const isApproved = stageReviewStatuses[stage.key] === "approved";
          const isCurrent = stage.key === currentStage;

          return (
            <div key={stage.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={[
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold leading-none",
                  isApproved
                    ? "bg-[#17a674] text-white"
                    : isCurrent
                    ? "bg-[#5465e8] text-white"
                    : "bg-[#eef0f6] text-(--color-text-muted)",
                ].join(" ")}
              >
                {isApproved ? "✓" : i + 1}
              </div>
              <p
                className={[
                  "text-center text-[10px] font-medium uppercase tracking-[0.6px] leading-[15px]",
                  isCurrent ? "text-(--color-text-primary)" : "text-(--color-text-muted)",
                ].join(" ")}
              >
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Stage label + review badge */}
      <div className="absolute left-5 right-5 top-[143.5px] flex items-center justify-between">
        <p className="text-[12px] leading-[18px] text-(--color-text-secondary)">
          {currentStageLabel}
        </p>
        <span
          className="rounded-full px-2 py-[1.5px] text-[11px] font-medium uppercase tracking-[0.55px] leading-[16.5px]"
          style={{ backgroundColor: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="absolute left-5 right-5 top-[171.5px] h-1.5 overflow-hidden rounded-full bg-[#eef0f6]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#5465e8] to-[#17a674]"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Footer */}
      <div className="absolute left-5 right-5 top-[185.5px] flex items-center justify-between">
        <p className="text-[12px] leading-[18px] text-(--color-text-muted)">
          {doneTasks}/{totalTasks} tasks
        </p>
        <p className="text-[12px] leading-[18px] text-(--color-text-muted)">
          {lastUpdatedAt ? formatDistanceToNow(lastUpdatedAt) : "—"}
        </p>
      </div>
    </div>
  );
}
