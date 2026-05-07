"use client";

import { useMemo } from "react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";

export function BoardHeader() {
  const { workspace, features } = useBoardContext();

  const totalTasks = useMemo(
    () => features.reduce((sum, feature) => sum + feature.tasks.length, 0),
    [features],
  );
  const workspaceName = workspace.name || workspace.repo;
  const initials = workspaceName
    .split(/[\s-_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-surface px-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-purple text-xs font-bold text-white">
          {initials || workspace.repo.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex min-w-0 items-center gap-4">
          <span className="truncate text-sm font-bold uppercase text-text-primary">
            {workspaceName}
          </span>
          <span className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
          <span className="shrink-0 text-xs text-text-secondary">
            {features.length} project{features.length === 1 ? "" : "s"}
          </span>
          <span className="shrink-0 text-xs text-text-primary">
            {totalTasks} task{totalTasks === 1 ? "" : "s"}
          </span>
          {workspace.isPrivate && (
            <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-text-muted">
              private
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
