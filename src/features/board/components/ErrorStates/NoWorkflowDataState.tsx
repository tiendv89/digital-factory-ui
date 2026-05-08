"use client";

import { FolderOpen } from "lucide-react";

export function NoWorkflowDataState({ message }: { message?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle">
        <FolderOpen className="h-6 w-6 text-text-muted" aria-hidden="true" />
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-text-primary">No Workflow Data</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {message ??
            "This repository does not contain a docs/features/ directory. Make sure your workspace is set up correctly."}
        </p>
      </div>
    </div>
  );
}
