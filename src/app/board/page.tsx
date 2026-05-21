"use client";

import { AlertCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { ImportModal } from "@/features/workspaces/components/ImportModal";
import { WorkspaceTabBar } from "@/features/workspaces/components/WorkspaceTabBar";
import { BoardHeader } from "@/features/board/components/BoardHeader";
import { BoardProvider, KanbanBoard } from "@/features/board/components/KanbanBoard";
import { TaskTrackingPanel } from "@/features/board/components/TaskTrackingPanel";
import { FeatureDetailSheetMount } from "@/features/board/components/FeatureDetailSheet";
import { TaskDetailSheetMount, TaskTabView } from "@/features/tasks";

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

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-base font-semibold text-text-primary">No workspace selected</p>
        <p className="text-sm text-text-secondary">Import a repository to get started.</p>
        <button
          type="button"
          onClick={onImport}
          className="flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Import Workspace
        </button>
      </div>
    </main>
  );
}

function ActiveTaskTabSurface({
  workspaceId,
  taskId,
}: {
  workspaceId: string;
  taskId: string;
}) {
  return (
    <main className="flex h-screen flex-col bg-bg">
      <WorkspaceTabBar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TaskTabView workspaceId={workspaceId} taskId={taskId} />
      </div>
    </main>
  );
}

export default function BoardPage() {
  const {
    activeWorkspace,
    loadingWorkspace,
    workspaceError,
    summaries,
    activeSurface,
    activeTaskTabId,
  } = useWorkspaceContext();
  const [showImport, setShowImport] = useState(false);

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
    if (summaries.length === 0) {
      return (
        <>
          <EmptyState onImport={() => setShowImport(true)} />
          {showImport && (
            <ImportModal
              onClose={() => setShowImport(false)}
              onSuccess={() => setShowImport(false)}
            />
          )}
        </>
      );
    }
    return <LoadingState />;
  }

  if (activeSurface === "task-tab" && activeTaskTabId) {
    return (
      <ActiveTaskTabSurface
        workspaceId={activeWorkspace.id}
        taskId={activeTaskTabId}
      />
    );
  }

  return (
    <main className="flex h-screen flex-col bg-bg">
      <BoardProvider workspaceDetail={activeWorkspace}>
        <WorkspaceTabBar />
        <BoardHeader />
        <div className="flex flex-1 overflow-hidden">
          <TaskTrackingPanel />
          <section className="min-w-0 flex-1 overflow-hidden p-6">
            <KanbanBoard />
          </section>
        </div>
        <TaskDetailSheetMount />
        <FeatureDetailSheetMount />
      </BoardProvider>
    </main>
  );
}
