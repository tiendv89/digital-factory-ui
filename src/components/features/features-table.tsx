import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { FeatureSummary, FeatureStatus, StageReviewStatus } from "@/types/feature";
import { formatRelativeTime, formatStageLabel } from "@/lib/utils";

const STATUS_BADGE: Record<FeatureStatus, { bgClass: string; textClass: string; label: string }> = {
  in_design: { bgClass: "bg-purple-bg", textClass: "text-purple", label: "In Design" },
  in_tdd: { bgClass: "bg-purple-bg", textClass: "text-purple", label: "In TDD" },
  ready_for_implementation: { bgClass: "bg-purple-bg", textClass: "text-purple", label: "Ready" },
  in_implementation: { bgClass: "bg-yellow-bg", textClass: "text-yellow", label: "In Implementation" },
  in_handoff: { bgClass: "bg-muted-bg", textClass: "text-text-muted", label: "In Handoff" },
  done: { bgClass: "bg-success-bg", textClass: "text-success", label: "Done" },
  blocked: { bgClass: "bg-danger-bg", textClass: "text-danger", label: "Blocked" },
  cancelled: { bgClass: "bg-muted-bg", textClass: "text-text-muted", label: "Cancelled" },
};

const REVIEW_BADGE: Record<StageReviewStatus, { bgClass: string; textClass: string; label: string }> = {
  draft: { bgClass: "bg-muted-bg", textClass: "text-text-secondary", label: "Draft" },
  awaiting_approval: { bgClass: "bg-warning-bg", textClass: "text-warning", label: "Awaiting Approval" },
  approved: { bgClass: "bg-success-bg", textClass: "text-success", label: "Approved" },
  rejected: { bgClass: "bg-danger-bg", textClass: "text-danger", label: "Rejected" },
};


function StatusBadge({ status }: { status: FeatureStatus }) {
  const { bgClass, textClass, label } = STATUS_BADGE[status];
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium uppercase tracking-[0.5645px] ${bgClass} ${textClass}`}
    >
      {label}
    </span>
  );
}

function ReviewBadge({ reviewStatus }: { reviewStatus: StageReviewStatus }) {
  const { bgClass, textClass, label } = REVIEW_BADGE[reviewStatus];
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium uppercase tracking-[0.5645px] ${bgClass} ${textClass}`}
    >
      {label}
    </span>
  );
}

function LifecycleBar({ done, total, cancelled }: { done: number; total: number; cancelled: boolean }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted-bg"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${cancelled ? "bg-text-muted opacity-50" : "bg-gradient-to-r from-primary to-success"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const GRID_COLS = "2fr 1.3fr 1.5fr 1.5fr 1.1fr 48px";

const TABLE_HEADER_COLS = ["Feature", "Status", "Stage", "Tasks", "Last Updated", ""] as const;

interface FeaturesTableProps {
  features: FeatureSummary[];
  searchQuery?: string;
}

export function FeaturesTable({ features, searchQuery }: FeaturesTableProps) {
  const filtered = searchQuery
    ? features.filter(
        (f) =>
          f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.featureId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : features;

  if (filtered.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-[14px] border border-border bg-surface shadow-[0px_1px_2px_0px_rgba(16,24,40,0.04)]">
        <p className="text-sm text-text-muted">No features found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-[0px_1px_2px_0px_rgba(16,24,40,0.04)]">
      {/* Table header */}
      <div
        className="grid h-11 items-center border-b border-border bg-surface-secondary px-5"
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        {TABLE_HEADER_COLS.map((col) => (
          <span
            key={col}
            className="text-[11px] font-medium uppercase tracking-[0.5645px] text-text-muted"
          >
            {col}
          </span>
        ))}
      </div>

      {/* Table rows */}
      <ul role="list" className="divide-y divide-border">
        {filtered.map((feature) => {
          const { tasksDone: done, tasksTotal: total } = feature;
          const cancelled = feature.featureStatus === "cancelled";

          return (
            <li key={feature.featureId}>
              <Link
                href={`/features/${feature.featureId}`}
                className="grid h-16 items-center px-5 transition-colors hover:bg-bg"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                {/* Feature name + ID */}
                <div className="min-w-0 pr-4">
                  <p className="truncate text-[14px] font-medium leading-[1.5] text-text-primary">
                    {feature.title}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[12px] text-text-muted">
                    {feature.featureId}
                  </p>
                </div>

                {/* Status badge */}
                <div>
                  <StatusBadge status={feature.featureStatus} />
                </div>

                {/* Stage + review badge */}
                <div className="flex min-w-0 flex-col gap-1 pr-4">
                  <p className="truncate text-[13px] font-medium text-text-primary">
                    {formatStageLabel(feature.currentStage)}
                  </p>
                  {feature.currentStageReviewStatus && (
                    <ReviewBadge reviewStatus={feature.currentStageReviewStatus} />
                  )}
                </div>

                {/* Tasks progress */}
                <div className="flex min-w-0 flex-col gap-1.5 pr-4">
                  <p className="text-[12px] font-medium text-text-secondary">
                    {done}/{total}
                  </p>
                  <LifecycleBar done={done} total={total} cancelled={cancelled} />
                </div>

                {/* Last updated */}
                <div>
                  <span className="text-[12px] font-medium text-text-muted">
                    {formatRelativeTime(feature.lastUpdatedAt)}
                  </span>
                </div>

                {/* Chevron */}
                <div className="flex justify-end">
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
