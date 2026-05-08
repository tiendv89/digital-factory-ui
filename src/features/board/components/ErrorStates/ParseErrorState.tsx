"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";

export function ParseErrorState({ message }: { message?: string }) {
  const { reload, loading } = useBoardContext();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-bg">
        <AlertCircle className="h-6 w-6 text-warning" aria-hidden="true" />
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-text-primary">Parse Error</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {message ??
            "One or more YAML files could not be parsed. Try syncing to refresh the data."}
        </p>
      </div>
      <button
        type="button"
        onClick={reload}
        disabled={loading}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw
          className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")}
          aria-hidden="true"
        />
        {loading ? "Syncing\u2026" : "Sync"}
      </button>
    </div>
  );
}
