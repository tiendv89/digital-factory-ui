import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FeatureSummary, FeatureStatus, LifecycleStage } from "@/types/feature";
import { formatRelativeTime, formatStageLabel } from "@/lib/utils";

// Figma-derived status badge color map
const STATUS_BADGE: Record<
  FeatureStatus,
  { bg: string; color: string; label: string }
> = {
  in_design: {
    bg: "var(--color-primary-light)",
    color: "var(--color-primary)",
    label: "In Design",
  },
  in_tdd: {
    bg: "var(--color-ready-bg)",
    color: "var(--color-ready)",
    label: "In TDD",
  },
  ready_for_implementation: {
    bg: "var(--color-ready-bg)",
    color: "var(--color-ready)",
    label: "Ready",
  },
  in_implementation: {
    bg: "var(--color-success-bg)",
    color: "var(--color-success)",
    label: "In Implementation",
  },
  in_handoff: {
    bg: "var(--color-warning-bg)",
    color: "var(--color-warning)",
    label: "In Handoff",
  },
  done: {
    bg: "var(--color-primary-light)",
    color: "var(--color-primary)",
    label: "Done",
  },
  blocked: {
    bg: "var(--color-danger-bg)",
    color: "var(--color-danger)",
    label: "Blocked",
  },
  cancelled: {
    bg: "var(--color-border)",
    color: "var(--color-text-secondary)",
    label: "Cancelled",
  },
};

// Ordered lifecycle stages for progress calculation
const LIFECYCLE_ORDER: LifecycleStage[] = [
  "product_spec",
  "technical_design",
  "tasks",
  "handoff",
];

function lifecycleProgress(
  stage: LifecycleStage,
  featureStatus: FeatureStatus
): number {
  if (featureStatus === "done") return 100;
  const idx = LIFECYCLE_ORDER.indexOf(stage);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / LIFECYCLE_ORDER.length) * 100);
}

interface StatusBadgeProps {
  status: FeatureStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, color, label } = STATUS_BADGE[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium leading-none"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}

interface LifecycleBarProps {
  stage: LifecycleStage;
  featureStatus: FeatureStatus;
}

function LifecycleBar({ stage, featureStatus }: LifecycleBarProps) {
  const pct = lifecycleProgress(stage, featureStatus);
  const cancelled = featureStatus === "cancelled";

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full"
      style={{ backgroundColor: "var(--color-border)" }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${pct}%`,
          backgroundColor: cancelled
            ? "var(--color-text-muted)"
            : "var(--color-primary)",
          opacity: cancelled ? 0.5 : 1,
        }}
      />
    </div>
  );
}

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
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-(--color-border) bg-(--color-surface)">
        <p className="text-sm text-(--color-text-muted)">No features found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface)">
      {/* Table header */}
      <div
        className="grid items-center px-5 py-3"
        style={{
          backgroundColor: "var(--color-surface-secondary)",
          gridTemplateColumns: "2fr 1.2fr 1.4fr 1.4fr 1fr 48px",
        }}
      >
        {(["Feature", "Status", "Stage", "Tasks", "Last Updated", ""] as const).map(
          (col) => (
            <span
              key={col}
              className="text-[11px] font-medium text-(--color-text-muted)"
            >
              {col}
            </span>
          )
        )}
      </div>

      {/* Table rows */}
      <ul role="list" className="divide-y divide-(--color-border)">
        {filtered.map((feature) => (
          <li key={feature.featureId}>
            <Link
              href={`/features/${feature.featureId}`}
              className="grid items-center px-5 py-4 transition-colors hover:bg-(--color-bg)"
              style={{
                gridTemplateColumns: "2fr 1.2fr 1.4fr 1.4fr 1fr 48px",
              }}
            >
              {/* Feature name + ID */}
              <div className="min-w-0 pr-4">
                <p className="truncate text-sm font-medium text-(--color-text-primary)">
                  {feature.title}
                </p>
                <p className="mt-0.5 truncate font-mono text-xs text-(--color-text-muted)">
                  {feature.featureId}
                </p>
              </div>

              {/* Status badge */}
              <div>
                <StatusBadge status={feature.featureStatus} />
              </div>

              {/* Stage */}
              <div className="min-w-0 pr-4">
                <p className="truncate text-sm text-(--color-text-primary)">
                  {formatStageLabel(feature.currentStage)}
                </p>
                {feature.nextAction && (
                  <p className="mt-0.5 truncate text-xs text-(--color-text-muted)">
                    {feature.nextAction}
                  </p>
                )}
              </div>

              {/* Lifecycle progress bar */}
              <div className="min-w-0 pr-4">
                <p className="mb-1.5 text-xs text-(--color-text-muted)">
                  {lifecycleProgress(feature.currentStage, feature.featureStatus)}% complete
                </p>
                <LifecycleBar
                  stage={feature.currentStage}
                  featureStatus={feature.featureStatus}
                />
              </div>

              {/* Last updated */}
              <div>
                <span className="text-[12px] font-medium text-(--color-text-muted)">
                  {formatRelativeTime(feature.lastUpdatedAt)}
                </span>
              </div>

              {/* Arrow icon */}
              <div className="flex justify-end">
                <ArrowRight
                  size={16}
                  className="shrink-0 text-(--color-text-muted)"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
