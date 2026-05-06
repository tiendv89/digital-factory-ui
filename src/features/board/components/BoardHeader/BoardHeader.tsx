"use client";

import { RefreshCw } from "lucide-react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";

export function BoardHeader() {
  const { workspace, loading, reload } = useBoardContext();

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-text-primary">
          {workspace.owner}/{workspace.repo}
        </span>
        {workspace.isPrivate && (
          <span className="rounded border border-border px-1.5 py-0.5 text-xs text-text-muted">
            private
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={reload}
        disabled={loading}
        aria-label="Sync board"
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw
          className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")}
          aria-hidden="true"
        />
        {loading ? "Syncing…" : "Sync"}
      </button>
    </header>
  );
}
