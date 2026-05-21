"use client";

import { useMemo } from "react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import { WorkspaceSwitcher } from "@/features/workspaces/components/WorkspaceSwitcher";

export function BoardHeader() {
  const { workspaceDetail, features } = useBoardContext();

  const totalTasks = useMemo(
    () => features.reduce((sum, feature) => sum + feature.tasks.length, 0),
    [features],
  );

  const workspaceName = workspaceDetail.name || workspaceDetail.slug;
  const initials = workspaceName
    .split(/[\s-_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-surface px-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-purple text-xs font-bold text-white">
          {initials || workspaceName.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex min-w-0 items-center gap-4">
          <WorkspaceSwitcher />
          <span className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
          <span className="shrink-0 text-xs text-text-secondary">
            {features.length} project{features.length === 1 ? "" : "s"}
          </span>
          <span className="shrink-0 text-xs text-text-primary">
            {totalTasks} task{totalTasks === 1 ? "" : "s"}
          </span>
          {workspaceDetail.source_state?.stale && (
            <span className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[11px] text-warning">
              stale
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
