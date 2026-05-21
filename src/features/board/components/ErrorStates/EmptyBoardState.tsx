"use client";

import { LayoutGrid } from "lucide-react";

export function EmptyBoardState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle">
        <LayoutGrid className="h-6 w-6 text-text-muted" aria-hidden="true" />
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-text-primary">No Features Yet</h2>
        <p className="mt-1 text-sm text-text-secondary">
          This workspace has no features. Sync the workspace to refresh data from
          the backend, or add features to your repository.
        </p>
      </div>
    </div>
  );
}
