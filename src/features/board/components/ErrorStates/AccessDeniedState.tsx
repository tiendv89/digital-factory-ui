"use client";

import { AlertTriangle } from "lucide-react";

export function AccessDeniedState({ message }: { message?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg">
        <AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-text-primary">Access Denied</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {message ?? "You do not have permission to access this workspace."}
        </p>
      </div>
    </div>
  );
}
