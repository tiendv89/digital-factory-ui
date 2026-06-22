"use client";

import { AlertCircle, Layers, Plus } from "lucide-react";

import { BoardView } from "@/components/board/board-view";
import { BoardProvider } from "@/components/board/kanban-board.context";
import { CreateWorkspaceModal } from "@/components/workspaces/create-workspace-modal";
import { EmptyState } from "@/components/workspaces/empty-state";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { useOrgWorkspaceSelection } from "@/hooks/workspaces/use-org-workspace-selection";
import { useState } from "react";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-secondary ${className ?? ""}`} />;
}

function LoadingState() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border px-6">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-[30px] w-[220px] rounded-md" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-[30px] w-28 rounded-full" />
          <SkeletonBlock className="h-[30px] w-24 rounded-full" />
          <SkeletonBlock className="h-[30px] w-24 rounded-full" />
        </div>
        <div className="flex-1" />
        <SkeletonBlock className="h-[30px] w-28 rounded-lg" />
        <SkeletonBlock className="h-[30px] w-16 rounded-md" />
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {([3, 2, 4] as const).map((count, i) => (
          <div key={i} className="flex w-72 shrink-0 flex-col border-r border-border px-3 py-3">
            <div className="mb-3 flex items-center gap-2">
              <SkeletonBlock className="h-3 w-3 rounded-full" />
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="ml-auto h-4 w-6" />
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: count }).map((_, j) => (
                <div key={j} className="rounded-lg border border-border bg-surface p-3">
                  <SkeletonBlock className="mb-2 h-3 w-3/4" />
                  <SkeletonBlock className="mb-3 h-2 w-1/2" />
                  <div className="flex gap-1.5">
                    <SkeletonBlock className="h-5 w-14 rounded-full" />
                    <SkeletonBlock className="h-5 w-10 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
      <AlertCircle className="h-8 w-8 text-danger" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}

function NoWorkspaceState({ orgId }: { orgId?: string }) {
  const [showCreate, setShowCreate] = useState(false);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4" data-no-workspace-state>
      <Layers className="h-8 w-8 text-text-muted" />
      <div className="text-center">
        <p className="text-sm font-medium text-text-primary">No workspaces yet</p>
        <p className="mt-1 text-xs text-text-muted">Create a workspace to get started.</p>
      </div>
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        New workspace
      </button>
      {showCreate && <CreateWorkspaceModal orgId={orgId} onClose={() => setShowCreate(false)} />}
    </div>
  );
}

export default function BoardPage() {
  const { activeWorkspace, loadingWorkspace, workspaceError, summaries, selectedWorkspaceId } = useWorkspaceContext();
  const { activeMembership } = useOrgWorkspaceSelection();

  if (loadingWorkspace) {
    return <LoadingState />;
  }

  if (workspaceError) {
    return <ErrorState message={workspaceError.message || "Failed to load workspace."} />;
  }

  if (!activeWorkspace && summaries.length === 0) {
    return <EmptyState />;
  }

  // No workspace selected for the active org (e.g. switched to an org with no workspaces)
  if (!activeWorkspace && !selectedWorkspaceId) {
    return <NoWorkspaceState orgId={activeMembership?.organization_id} />;
  }

  if (!activeWorkspace) {
    return <LoadingState />;
  }

  return (
    <div data-board-page className="flex h-full flex-col overflow-hidden bg-bg">
      <BoardProvider workspaceDetail={activeWorkspace}>
        <BoardView />
      </BoardProvider>
    </div>
  );
}
