"use client";

import { useMemo } from "react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";

function formatSyncedTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const hours = date.getUTCHours();
  const displayHours = hours % 12 || 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";

  return `${displayHours}:${minutes}:${seconds} ${suffix}`;
}

export function BoardTableTitle() {
  const { workspaceDetail, features } = useBoardContext();
  const totalTasks = useMemo(
    () => features.reduce((sum, feature) => sum + feature.tasks.length, 0),
    [features],
  );
  const workspaceName =
    workspaceDetail.name || workspaceDetail.slug || "Workspace";
  const { source_state } = workspaceDetail;

  return (
    <div
      data-board-table-title
      className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4"
    >
      <span
        className="min-w-0 truncate text-sm font-semibold text-text-primary capitalize"
        title={workspaceName}
      >
        {workspaceName}
      </span>
      <div className="flex shrink-0 items-center gap-3">
        <span className="shrink-0 text-xs text-text-secondary">
          {features.length} features
        </span>
        <span className="shrink-0 text-xs text-text-primary">
          {totalTasks} tasks
        </span>
        {source_state?.stale && (
          <span
            aria-label={
              source_state.error_code
                ? `Stale data: ${source_state.error_code}`
                : "Stale data"
            }
            title={
              source_state.error_code ?? "Workspace data may be out of date"
            }
            className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[11px] text-warning"
          >
            {source_state.error_code
              ? `stale: ${source_state.error_code}`
              : "stale"}
          </span>
        )}
        {source_state?.last_synced_at && (
          <span className="hidden shrink-0 text-[11px] text-text-muted sm:inline">
            synced {formatSyncedTime(source_state.last_synced_at)}
          </span>
        )}
      </div>
    </div>
  );
}
