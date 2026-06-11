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

function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded bg-surface-secondary ${className ?? ""}`} style={style} />;
}

export function LoadingState() {
  return (
    <main className="flex h-screen flex-col bg-bg">
      <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border px-6">
        <SkeletonBlock className="h-4 w-28" />
        <div className="flex-1" />
        <SkeletonBlock className="h-[30px] w-20 rounded-lg" />
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex w-65 shrink-0 flex-col gap-2 border-r border-border px-3 py-4">
          {[80, 56, 72, 48, 64, 52].map((w, i) => (
            <SkeletonBlock key={i} className={`h-3`} style={{ width: `${w}%` } as React.CSSProperties} />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-6">
          <SkeletonBlock className="h-6 w-1/2 rounded-md" />
          <SkeletonBlock className="h-3 w-1/4" />
          <div className="mt-2 flex flex-col gap-2">
            {[100, 90, 75, 100, 60].map((w, i) => (
              <SkeletonBlock key={i} className="h-3" style={{ width: `${w}%` } as React.CSSProperties} />
            ))}
          </div>
        </div>
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
