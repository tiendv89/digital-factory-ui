"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";

export function NetworkErrorState({ message }: { message?: string }) {
  const { reload, loading } = useBoardContext();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle">
        <WifiOff className="h-6 w-6 text-text-muted" aria-hidden="true" />
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-text-primary">Network Error</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {message ?? "Could not reach GitHub. Check your connection and try again."}
        </p>
      </div>
      <button
        type="button"
        onClick={reload}
        disabled={loading}
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw
          className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")}
          aria-hidden="true"
        />
        {loading ? "Retrying\u2026" : "Retry"}
      </button>
    </div>
  );
}
