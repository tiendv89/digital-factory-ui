"use client";

import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { BoardHeader } from "@/features/board/components/BoardHeader/BoardHeader";
import { BoardProvider } from "@/features/board/components/KanbanBoard/KanbanBoard.context";
import { KanbanBoard } from "@/features/board/components/KanbanBoard/KanbanBoard";
import { TaskTrackingPanel } from "@/features/board/components/TaskTrackingPanel/TaskTrackingPanel";

function LoadingState() {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-muted">Loading workspace…</p>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-8 w-8 text-danger" />
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    </main>
  );
}

export default function BoardPage() {
  const router = useRouter();
  const { activeWorkspace, loadingWorkspace, workspaceError, summaries } =
    useWorkspaceContext();

  useEffect(() => {
    if (
      !loadingWorkspace &&
      !workspaceError &&
      !activeWorkspace &&
      summaries.length === 0
    ) {
      router.replace("/connect");
    }
  }, [
    activeWorkspace,
    loadingWorkspace,
    router,
    summaries.length,
    workspaceError,
  ]);

  if (loadingWorkspace) {
    return <LoadingState />;
  }

  if (workspaceError) {
    return (
      <ErrorState
        message={workspaceError.message || "Failed to load workspace."}
      />
    );
  }

  if (!activeWorkspace) {
    return <LoadingState />;
  }

  return (
    <main className="flex h-screen flex-col bg-bg">
      <BoardProvider workspaceDetail={activeWorkspace}>
        <BoardHeader />
        <div className="flex flex-1 overflow-hidden">
          <TaskTrackingPanel />
          <section className="min-w-0 flex-1 overflow-hidden p-6">
            <KanbanBoard />
          </section>
        </div>
      </BoardProvider>
    </main>
  );
}
