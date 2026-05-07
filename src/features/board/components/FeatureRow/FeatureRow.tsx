"use client";

import { ChevronRight } from "lucide-react";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import type { SelectedTask } from "../KanbanBoard/KanbanBoard.context";
import { TaskCard } from "../TaskCard";
import {
  STATUS_COLUMNS,
  getFeatureStatusColor,
  getFeatureStatusLabel,
  getFeatureNextAction,
  getStatusColor,
  getStatusLabel,
} from "../../lib/status";

type FeatureRowProps = {
  feature: ParsedFeature;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectTask: (task: SelectedTask) => void;
  minColumnWidth: number;
};

function SegmentBar({ tasks }: { tasks: ParsedTask[] }) {
  if (tasks.length === 0) {
    return <div className="h-1.5 w-20 rounded" style={{ background: "#e4e7ef" }} />;
  }
  return (
    <div className="flex h-1.5 w-20 overflow-hidden rounded">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="h-full flex-1"
          style={{ background: getStatusColor(task.status) }}
          title={getStatusLabel(task.status)}
        />
      ))}
    </div>
  );
}

function FeatureStatusPill({ status }: { status: string }) {
  const color = getFeatureStatusColor(status);
  const label = getFeatureStatusLabel(status);
  return (
    <span
      className="shrink-0 rounded px-2 py-0.5 text-xs font-medium"
      style={{
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
      }}
    >
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

  const tasksByStatus = STATUS_COLUMNS.reduce<Record<string, ParsedTask[]>>(
    (acc, col) => {
      acc[col.key] = feature.tasks.filter((t) => t.status === col.key);
      return acc;
    },
    {},
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  }

  return (
    <div className="w-full border-b border-border">
      {/* Feature header — spans full width */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-controls={`feature-tasks-${feature.id}`}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <ChevronRight
          className={
            "h-4 w-4 shrink-0 text-text-muted transition-transform duration-150 " +
            (isExpanded ? "rotate-90" : "")
          }
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
          {feature.title || feature.id}
        </span>
        {nextAction && (
          <span className="shrink-0 truncate text-xs text-text-muted" title={nextAction}>
            → {nextAction}
          </span>
        )}
        <FeatureStatusPill status={feature.featureStatus} />
        <span className="shrink-0 text-xs text-text-muted">
          {doneTasks}/{totalTasks}
        </span>
        <SegmentBar tasks={feature.tasks} />
      </div>

      {/* Expanded task grid — 7 equal columns */}
      {isExpanded && (
        <div
          id={`feature-tasks-${feature.id}`}
          className="flex w-full border-t border-border"
        >
          {STATUS_COLUMNS.map((col) => {
            const colTasks = tasksByStatus[col.key] ?? [];
            return (
              <div
                key={col.key}
                className="flex min-w-0 flex-1 flex-col gap-2 border-r border-border p-2 last:border-r-0"
                style={{ minWidth: minColumnWidth }}
                role="group"
                aria-label={`${col.label} tasks for ${feature.title || feature.id}`}
              >
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    featureId={feature.id}
                    featureTitle={feature.title || feature.id}
                    onSelect={onSelectTask}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
