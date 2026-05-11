"use client";

import { ArrowRight } from "lucide-react";
import type { ParsedTask } from "@/services/yaml-parser";
import type { SelectedTask } from "../KanbanBoard/KanbanBoard.context";
import { getNextAction, getStatusColor } from "../../lib/status";

type TaskCardProps = {
  task: ParsedTask;
  featureId: string;
  featureTitle: string;
  onSelect: (task: SelectedTask) => void;
};

export function TaskCard({
  task,
  featureId,
  featureTitle,
  onSelect,
}: TaskCardProps) {
  const nextAction = getNextAction(task.status);
  const statusColor = getStatusColor(task.status);

  function handleClick() {
    onSelect({ task, featureId, featureTitle });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect({ task, featureId, featureTitle });
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-task-id={task.id}
      className="relative h-full min-h-19 cursor-pointer border border-border bg-surface p-3 transition-colors hover:border-primary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      aria-label={`Task ${task.id}: ${task.title}`}
    >
      <div className="mb-1 flex items-start gap-1">
        <span className="shrink-0 text-xs font-medium text-text-muted">
          {task.id}
        </span>
      </div>
      <p className="mb-2 text-xs font-medium leading-snug text-text-primary line-clamp-2">
        {task.title}
      </p>
      {nextAction && (
        <div className="flex min-w-0 items-center gap-1">
          <ArrowRight
            className="h-3 w-3 shrink-0"
            style={{ color: "#009252" }}
            aria-hidden="true"
          />
          <span className="truncate text-xs text-text-secondary">
            {nextAction}
          </span>
        </div>
      )}
    </div>
  );
}
