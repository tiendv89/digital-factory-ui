"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { clearWorkspace } from "@/services/workspace-store";

export function AccessDeniedState({ message }: { message?: string }) {
  const router = useRouter();

  function handleReconnect() {
    clearWorkspace();
    router.replace("/connect");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg">
        <AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-text-primary">Access Denied</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {message ?? "You do not have permission to access this repository."}
        </p>
      </div>
      <button
        type="button"
        onClick={handleReconnect}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        Reconnect
      </button>
    </div>
  );
}
