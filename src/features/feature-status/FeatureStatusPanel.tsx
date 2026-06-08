"use client";

import { useFeatureDetail } from "@/features/board/hooks/useFeatureDetail";
import { clientFeatureStatusLabel, getFeatureStatusColor } from "@/features/board/lib/status";
import type { TaskSummary } from "@/services/workflow-backend/types";

type StatusIconProps = { status: string };

const TASK_STATUS_ICON: Record<
  string,
  { symbol: string; colorClass: string }
> = {
  done:             { symbol: "✓", colorClass: "text-success" },
  in_progress:      { symbol: "●", colorClass: "text-warning" },
  in_review:        { symbol: "◌", colorClass: "text-purple" },
  reviewing:        { symbol: "◌", colorClass: "text-purple" },
  review_passed:    { symbol: "◌", colorClass: "text-purple" },
  change_requested: { symbol: "◌", colorClass: "text-purple" },
  blocked:          { symbol: "⊗", colorClass: "text-danger" },
  ready:            { symbol: "→", colorClass: "text-ready" },
  todo:             { symbol: "○", colorClass: "text-text-muted" },
  cancelled:        { symbol: "○", colorClass: "text-text-muted" },
};

function TaskStatusIcon({ status }: StatusIconProps) {
  const icon = TASK_STATUS_ICON[status] ?? { symbol: "○", colorClass: "text-text-muted" };
  return (
    <span className={"shrink-0 text-[10px] font-bold " + icon.colorClass} aria-hidden="true">
      {icon.symbol}
    </span>
  );
}

function TaskRow({ task }: { task: TaskSummary }) {
  return (
    <div
      data-task-row
      className="flex items-start gap-1.5 px-3 py-1.5"
    >
      <TaskStatusIcon status={task.status} />
      <span className="flex-1 truncate text-[11px] leading-4 text-text-secondary">
        {task.title || task.task_name}
      </span>
    </div>
  );
}

type FeatureStatusPanelProps = {
  workspaceId: string;
  featureId: string;
};

export function FeatureStatusPanel({ workspaceId, featureId }: FeatureStatusPanelProps) {
  const { feature, loading, error } = useFeatureDetail(workspaceId, featureId);

  if (loading) {
    return (
      <div
        data-feature-status-panel
        className="flex h-full flex-col overflow-hidden bg-surface"
      >
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-text-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !feature) {
    return (
      <div
        data-feature-status-panel
        className="flex h-full flex-col overflow-hidden bg-surface"
      >
        <div className="flex flex-1 items-center justify-center px-3">
          <p className="text-xs text-danger">{error?.message ?? "Failed to load feature."}</p>
        </div>
      </div>
    );
  }

  const stageColor = getFeatureStatusColor(feature.status);
  const stageLabel = clientFeatureStatusLabel(feature.status);
  const tasks = feature.tasks ?? [];

  return (
    <div
      data-feature-status-panel
      className="flex h-full flex-col overflow-hidden bg-surface"
    >
      <div className="shrink-0 border-b border-border px-3 py-2">
        <p className="truncate text-[11px] font-semibold text-text-primary">
          {feature.feature_name || feature.feature_id}
        </p>
        <span
          data-feature-stage-badge
          className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: stageColor }}
        >
          {stageLabel}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-text-muted">No tasks.</p>
        ) : (
          tasks.map((task) => <TaskRow key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
