"use client";

import type { ParsedTask } from "@/services/yaml-parser";
import type { SelectedTask } from "../KanbanBoard/KanbanBoard.context";
import { getNextAction } from "../../lib/status";

type TaskCardProps = {
  task: ParsedTask;
  featureId: string;
  featureTitle: string;
  onSelect: (task: SelectedTask) => void;
};

function ActorBadge({ actorType }: { actorType: string }) {
  if (actorType === "agent") {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs"
        style={{ background: "rgba(172,70,255,0.15)", color: "#ac46ff" }}
        title="Agent"
        aria-label="Executed by agent"
      >
        🤖
      </span>
    );
  }
  if (actorType === "human") {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs"
        style={{ background: "rgba(43,127,255,0.15)", color: "#2b7fff" }}
        title="Human"
        aria-label="Executed by human"
      >
        👤
      </span>
    );
  }
  return null;
}

export function TaskCard({ task, featureId, featureTitle, onSelect }: TaskCardProps) {
  const nextAction = getNextAction(task.status);

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
      className="cursor-pointer rounded border border-border bg-surface p-2.5 transition-shadow hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      aria-label={`Task ${task.id}: ${task.title}`}
    >
      <div className="mb-1 flex items-start justify-between gap-1">
        <span className="shrink-0 text-xs font-medium text-text-muted">{task.id}</span>
        {task.execution?.actor_type && (
          <ActorBadge actorType={task.execution.actor_type} />
        )}
      </div>
      <p className="mb-2 text-xs font-medium leading-snug text-text-primary line-clamp-2">
        {task.title}
      </p>
      {nextAction && (
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium" style={{ color: "#009252" }}>
            →
          </span>
          <span className="truncate text-xs text-text-secondary">{nextAction}</span>
        </div>
      )}
    </div>
  );
}
