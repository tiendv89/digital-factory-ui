"use client";

import { ArrowRight, ChevronRight, Layers3 } from "lucide-react";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import type { SelectedTask } from "../KanbanBoard/KanbanBoard.context";
import { TaskCard } from "../TaskCard";
import {
  STATUS_COLUMNS,
  getFeatureStatusColor,
  getFeatureStatusLabel,
  getFeatureNextAction,
} from "../../lib/status";

type FeatureRowProps = {
  feature: ParsedFeature;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectTask: (task: SelectedTask) => void;
  minColumnWidth: number;
};

function SegmentBar({ tasks }: { tasks: ParsedTask[] }) {
  const statusSegments = STATUS_COLUMNS.map((col) => ({
    ...col,
    count: tasks.filter((task) => task.status === col.key).length,
  })).filter((status) => status.count > 0);

  if (tasks.length === 0) {
    return (
      <div className="relative h-1.5 w-24 rounded" style={{ background: "#e4e7ef" }} />
    );
  }

  return (
    <div
      className="flex h-1.5 w-24 overflow-visible rounded-full"
      aria-label="Task progress by status"
    >
      {statusSegments.map((status) => (
        <div
          key={status.key}
          data-progress-segment
          className="group/segment relative h-full min-w-2 first:rounded-l-full last:rounded-r-full"
          style={{
            background: status.color,
            flexBasis: 0,
            flexGrow: status.count,
          }}
          aria-label={`${status.key}: ${status.count}`}
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
                style={{ background: status.color }}
                aria-hidden="true"
              />
              {status.key}: {status.count}
            </span>
          </div>
        </div>
      ))}
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
  minColumnWidth,
}: FeatureRowProps) {
  const totalTasks = feature.tasks.length;
  const doneTasks = feature.tasks.filter((t) => t.status === "done").length;
  const nextAction = getFeatureNextAction(feature.tasks);
  const gridTemplateColumns = `repeat(${STATUS_COLUMNS.length}, minmax(${minColumnWidth}px, 1fr))`;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  }

  return (
    <div className="w-full border-b border-border bg-surface">
      {/* Feature header — spans full width */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-controls={`feature-tasks-${feature.id}`}
        className="flex min-h-[46px] w-full cursor-pointer items-center gap-3 px-5 py-0 transition-colors hover:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <ChevronRight
          className={
            "h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-150 " +
            (isExpanded ? "rotate-90" : "")
          }
          aria-hidden="true"
        />
        <Layers3 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        <span className="min-w-0 max-w-[320px] truncate text-sm font-semibold uppercase text-text-primary">
          {feature.title || feature.id}
        </span>
        <FeatureStatusPill status={feature.featureStatus} />
        <span className="shrink-0 text-xs font-semibold text-text-secondary">
          {doneTasks}/{totalTasks}
        </span>
        <SegmentBar tasks={feature.tasks} />
        <span className="min-w-0 flex-1" aria-hidden="true" />
      </div>

      {/* Expanded task grid — 7 equal columns */}
      {isExpanded && (
        <div
          id={`feature-tasks-${feature.id}`}
          className="w-full border-t border-border"
        >
          {feature.tasks.map((task) => {
            const taskColumnKey = STATUS_COLUMNS.some((col) => col.key === task.status)
              ? task.status
              : STATUS_COLUMNS[0].key;

            return (
              <div
                key={task.id}
                data-task-grid-row
                className="grid min-h-[94px] border-b border-border last:border-b-0"
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
