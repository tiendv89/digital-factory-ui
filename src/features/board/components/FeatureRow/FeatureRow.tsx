"use client";

import { ChevronRight, Clock3, Layers3 } from "lucide-react";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import {
  formatTimestamp,
  getFeatureLastModifiedAt,
  isTodayTimestamp,
} from "@/lib/time";
import { Tooltip } from "@/components/ui/Tooltip";
import { TaskCard } from "../TaskCard";
import {
  TASK_MODE_STATUSES,
  STATUS_COLUMNS,
  getFeatureStatusColor,
} from "../../lib/status";

type FeatureRowProps = {
  feature: ParsedFeature;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenTaskTab?: (task: ParsedTask) => void;
  onOpenTaskTabNewSession?: (task: ParsedTask) => void;
};

function FeatureStatusPill({ status }: { status: string }) {
  const color = getFeatureStatusColor(status);
  const label = status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function FeatureRow({
  feature,
  isExpanded,
  onToggle,
  onOpenTaskTab,
  onOpenTaskTabNewSession,
}: FeatureRowProps) {
  const totalTasks = feature.taskCounts?.total ?? feature.tasks.length;
  const doneTasks =
    feature.taskCounts?.done ??
    feature.tasks.filter((t) => t.status === "done").length;
  const lastModifiedAt = getFeatureLastModifiedAt(feature);
  const modifiedToday = lastModifiedAt
    ? isTodayTimestamp(lastModifiedAt)
    : false;
  const updatedToday = feature.updatedAt
    ? isTodayTimestamp(feature.updatedAt)
    : false;
  const gridTemplateColumns = `repeat(${TASK_MODE_STATUSES.length}, minmax(0, 1fr))`;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  }

  return (
    <div className="w-full border-b border-border bg-bg">
      {/* Feature header — spans full width */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-controls={`feature-tasks-${feature.id}`}
        className="flex min-h-11 w-full flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2 transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ChevronRight
            className={
              "h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-150 " +
              (isExpanded ? "rotate-90" : "")
            }
            aria-hidden="true"
          />
          <Layers3
            className="h-4 w-4 shrink-0 text-success"
            aria-hidden="true"
          />
          <span
            className="min-w-0 truncate text-sm font-semibold uppercase text-text-primary"
            title={feature.id}
          >
            {feature.id}
          </span>
        </div>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <FeatureStatusPill status={feature.featureStatus} />
          <Tooltip content={`${doneTasks} done / ${totalTasks} total tasks`}>
            <span className="shrink-0 text-xs font-medium text-text-secondary">
              {doneTasks}/{totalTasks}
            </span>
          </Tooltip>
          {updatedToday && feature.updatedAt && (
            <span className="shrink-0 rounded bg-success-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
              Modify{" "}
              {new Date(feature.updatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}

          {lastModifiedAt && (
            <span
              data-feature-modified-at={lastModifiedAt}
              data-modified-today={modifiedToday ? "true" : "false"}
              className={
                "flex min-w-0 shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs " +
                (modifiedToday
                  ? "bg-success-bg font-semibold text-success"
                  : "text-text-muted")
              }
              title={`Modified ${lastModifiedAt}`}
            >
              <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Modified {formatTimestamp(lastModifiedAt)}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Expanded task grid — 7 equal columns */}
      {isExpanded && (
        <div
          id={`feature-tasks-${feature.id}`}
          className="w-full border-t border-border"
        >
          {feature.tasks.map((task) => {
            // Group task into its status column; fall back to first allowed column
            // for any status outside the Task Mode allowlist (e.g. review_passed).
            const taskColumnKey = (
              TASK_MODE_STATUSES as readonly string[]
            ).includes(task.status)
              ? task.status
              : TASK_MODE_STATUSES[0];

            return (
              <div
                key={task.id}
                data-task-grid-row
                className="grid min-h-23.5 border-b border-border last:border-b-0"
                style={{ gridTemplateColumns }}
                role="row"
                aria-label={`${task.id} ${task.title}`}
              >
                {TASK_MODE_STATUSES.map((colStatus) => {
                  const col = STATUS_COLUMNS.find((c) => c.key === colStatus)!;
                  return (
                    <div
                      key={`${task.id}-${colStatus}`}
                      data-status-cell
                      className="min-w-0 border-r border-border p-2 last:border-r-0"
                      role="cell"
                      aria-label={`${col.label} cell for ${task.id}`}
                    >
                      {colStatus === taskColumnKey && (
                        <TaskCard
                          task={task}
                          featureId={feature.id}
                          featureTitle={feature.title || feature.id}
                          onOpenTab={onOpenTaskTab}
                          onOpenNewTab={onOpenTaskTabNewSession}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
