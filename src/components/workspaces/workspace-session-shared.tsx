"use client";

import { AlertCircle } from "lucide-react";
import { type ReactNode, useEffect } from "react";

import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { WorkspaceHeader } from "@/components/workspaces/workspace-header";
import type { WorkspaceDetail } from "@/services/workflow-backend";

export type TaskSessionPageProps = {
  taskId: string;
};

export type FeatureSessionPageProps = {
  featureId: string;
};

export function LoadingState() {
  return (
    <main className="flex h-screen flex-col bg-bg">
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-muted">Loading workspace…</p>
      </div>
    </main>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <main className="flex h-screen flex-col bg-bg">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-8 w-8 text-danger" aria-hidden="true" />
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    </main>
  );
}

export function useWorkspaceRoute(workspaceId: string) {
  const { activeWorkspace, loadingWorkspace, workspaceError, selectedWorkspaceId, selectWorkspace } = useWorkspaceContext();

  useEffect(() => {
    if (!workspaceId || selectedWorkspaceId === workspaceId) return;
    selectWorkspace(workspaceId);
  }, [selectWorkspace, selectedWorkspaceId, workspaceId]);

  return {
    activeWorkspace,
    loadingWorkspace,
    workspaceError,
    isReady: activeWorkspace?.id === workspaceId,
  };
}

export function WorkspaceSessionShell({ workspace, children }: { workspace: WorkspaceDetail; children: ReactNode }) {
  return (
    <main className="flex h-screen flex-col bg-bg">
      <WorkspaceHeader
        workspaceName={workspace.name || workspace.slug}
        featureCount={workspace.features.length}
        taskCount={workspace.tasks.length}
        sourceState={workspace.source_state}
        showTitle={false}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </main>
  );
}
