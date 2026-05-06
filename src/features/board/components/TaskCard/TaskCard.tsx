"use client";

import type { ParsedTask } from "@/services/yaml-parser";
import { normalizeStatus, STATUS_NEXT_ACTION, STATUS_TONE } from "../../lib/status";

export type TaskCardProps = {
  task: ParsedTask;
  onSelect?: (task: ParsedTask) => void;
};

type ActorTone = {
  label: string;
  badgeBg: string;
  badgeText: string;
  initial: string;
};

function actorTone(actorType?: string): ActorTone | null {
  if (!actorType) return null;
  const value = actorType.toLowerCase();
  if (value === "agent") {
    return {
      label: "Agent",
      badgeBg: "bg-purple-bg",
      badgeText: "text-purple",
      initial: "A",
    };
  }
  if (value === "human") {
    return {
      label: "Human",
      badgeBg: "bg-primary-light",
      badgeText: "text-primary",
      initial: "H",
    };
  }
  return {
    label: "Either",
    badgeBg: "bg-muted-bg",
    badgeText: "text-text-secondary",
    initial: "E",
  };
}

export function TaskCard({ task, onSelect }: TaskCardProps) {
  const status = normalizeStatus(task.status);
  const tone = STATUS_TONE[status];
  const next = STATUS_NEXT_ACTION[status];
  const actor = actorTone(task.execution?.actor_type);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(task)}
      className={`group flex w-full flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary border-l-[3px] ${tone.cardBorder}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-text-secondary">
          <span>{task.id}</span>
          {actor && (
            <span
              className={`inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-semibold uppercase ${actor.badgeBg} ${actor.badgeText}`}
              title={actor.label}
              aria-label={actor.label}
            >
              {actor.initial}
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.badgeBg} ${tone.badgeText}`}
        >
          {status.replace(/_/g, " ")}
        </span>
      </div>
      <p className="line-clamp-2 text-xs font-medium text-text-primary">
        {task.title || "(untitled task)"}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-text-muted">
        {next}
      </p>
    </button>
  );
}
