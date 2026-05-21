"use client";

import { ChevronRight, Clock3, Layers3 } from "lucide-react";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import {
  formatTimestamp,
  getFeatureLastModifiedAt,
  isTodayTimestamp,
} from "@/lib/time";
import type { SelectedTask } from "../KanbanBoard/KanbanBoard.context";
import { TaskCard } from "../TaskCard";
import {
  STATUS_COLUMNS,
  getFeatureStatusColor,
  getFeatureStatusLabel,
} from "../../lib/status";

type FeatureRowProps = {
  feature: ParsedFeature;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectTask: (task: SelectedTask) => void;
  onOpenTaskTab?: (task: ParsedTask) => void;
};

function SegmentBar({ tasks }: { tasks: ParsedTask[] }) {
  if (tasks.length === 0) {
    return (
      <div
        className="relative h-1.5 w-24 rounded-full"
        style={{ background: "#e4e7ef" }}
      />
    );
  }

  return (
    <div
      className="flex h-1.5 w-24 gap-0.5 overflow-visible"
      aria-label="Task progress by status"
    >
      {tasks.map((task) => {
        const col = STATUS_COLUMNS.find((c) => c.key === task.status);
        const color = col?.color ?? "#8892b5";
        const statusLabel =
          col?.label ?? task.status.toUpperCase().replace(/_/g, " ");

        return (
          <div
            key={task.id}
            data-progress-segment
            className="group/segment relative h-full flex-1 rounded-full"
            style={{ background: color }}
            aria-label={`${task.id}: ${task.status}`}
            tabIndex={0}
          >
            <div
              data-progress-tooltip
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary opacity-0 shadow-lg transition-opacity group-hover/segment:opacity-100 group-focus/segment:opacity-100"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ background: color }}
                  aria-hidden="true"
                />
                {task.id}: {statusLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeatureStatusPill({ status }: { status: string }) {
  const color = getFeatureStatusColor(status);
  const label = getFeatureStatusLabel(status);
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
  onSelectTask,
  onOpenTaskTab,
}: FeatureRowProps) {
  const totalTasks = feature.tasks.length;
  const doneTasks = feature.tasks.filter((t) => t.status === "done").length;
  const lastModifiedAt = getFeatureLastModifiedAt(feature);
  const modifiedToday = lastModifiedAt
    ? isTodayTimestamp(lastModifiedAt)
    : false;
  const gridTemplateColumns = `repeat(${STATUS_COLUMNS.length}, minmax(0, 1fr))`;

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
          <span className="shrink-0 text-xs font-medium text-text-secondary">
            {doneTasks}/{totalTasks}
          </span>
          <SegmentBar tasks={feature.tasks} />
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
            const taskColumnKey = STATUS_COLUMNS.some(
              (col) => col.key === task.status,
            )
              ? task.status
              : STATUS_COLUMNS[0].key;

            return (
              <div
                key={task.id}
                data-task-grid-row
                className="grid min-h-23.5 border-b border-border last:border-b-0"
                style={{ gridTemplateColumns }}
                role="row"
                aria-label={`${task.id} ${task.title}`}
              >
                {STATUS_COLUMNS.map((col) => (
                  <div
                    key={`${task.id}-${col.key}`}
                    data-status-cell
                    className="min-w-0 border-r border-border p-2 last:border-r-0"
                    role="cell"
                    aria-label={`${col.label} cell for ${task.id}`}
                  >
                    {col.key === taskColumnKey && (
                      <TaskCard
                        task={task}
                        featureId={feature.id}
                        featureTitle={feature.title || feature.id}
                        onSelect={onSelectTask}
                        onOpenTab={onOpenTaskTab}
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
