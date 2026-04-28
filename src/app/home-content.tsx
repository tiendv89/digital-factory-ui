"use client";

import { WorkspacePicker } from "@/components/workspace/workspace-picker";
import { useWorkspace } from "@/context/workspace-context";
import type { WorkspaceSummary } from "@/types/workspace";

interface HomeContentProps {
  workspaces: WorkspaceSummary[];
}

export function HomeContent({ workspaces }: HomeContentProps) {
  const { activeWorkspaceId } = useWorkspace();

  if (!activeWorkspaceId) {
    return <WorkspacePicker workspaces={workspaces} />;
  }

  // Dashboard placeholder — implemented in T5
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-primary">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Workspace:{" "}
          <span className="font-mono font-medium">{activeWorkspaceId}</span>
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Full dashboard coming in T5.
        </p>
      </div>
    </div>
  );
}
