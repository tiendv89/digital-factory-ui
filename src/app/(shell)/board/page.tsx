"use client";

import { AlertCircle } from "lucide-react";

import { BoardView } from "@/components/board/board-view";
import { BoardProvider } from "@/components/board/kanban-board.context";
import { EmptyState } from "@/components/workspaces/empty-state";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";

function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <p className="text-sm text-text-muted">Loading workspace…</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <AlertCircle className="h-8 w-8 text-danger" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}

export default function BoardPage() {
  const { activeWorkspace, loadingWorkspace, workspaceError, summaries } = useWorkspaceContext();

  if (loadingWorkspace) {
    return <LoadingState />;
  }

  if (workspaceError) {
    return <ErrorState message={workspaceError.message || "Failed to load workspace."} />;
  }

  if (!activeWorkspace && summaries.length === 0) {
    return <EmptyState />;
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
