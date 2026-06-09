"use client";

import { MessageSquare } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { EmptyState } from "@/features/workspaces/components/EmptyState";
import { BoardHeader } from "@/features/board/components/BoardHeader/BoardHeader";
import { BoardProvider } from "@/features/board/components/KanbanBoard/KanbanBoard.context";
import { KanbanBoard } from "@/features/board/components/KanbanBoard/KanbanBoard";
import { TaskTrackingPanel } from "@/features/board/components/TaskTrackingPanel/TaskTrackingPanel";
import { AgentChatPanel } from "@/features/agent-chat";

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

function BoardAgentChat() {
  const { openFeatureTabs, activeFeatureTabId, selectedWorkspaceId } =
    useWorkspaceContext();

  const activeFeatureTab =
    openFeatureTabs.find((t) => t.sessionId === activeFeatureTabId) ??
    openFeatureTabs[0];

  const workspaceId = activeFeatureTab?.workspaceId ?? selectedWorkspaceId;

  return (
    <div className="flex w-96 shrink-0 flex-col border-l border-border">
      {activeFeatureTab && workspaceId ? (
        <AgentChatPanel
          workspaceId={workspaceId}
          featureId={activeFeatureTab.featureId}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <MessageSquare className="h-7 w-7 text-text-muted" aria-hidden="true" />
          <p className="text-xs text-text-muted">
            Open a feature to start chatting with the agent.
          </p>
        </div>
      )}
    </div>
  );
}

export default function BoardPage() {
  const { activeWorkspace, loadingWorkspace, workspaceError, summaries } =
    useWorkspaceContext();

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

  if (!activeWorkspace && summaries.length === 0) {
    return <EmptyState />;
  }

  if (!activeWorkspace) {
    return <LoadingState />;
  }

  return (
    <div
      data-board-page
      className="flex h-full flex-col"
    >
      <BoardProvider workspaceDetail={activeWorkspace}>
        <BoardHeader />
        <div className="flex flex-1 overflow-hidden">
          <TaskTrackingPanel />
          <section className="min-w-0 flex-1 overflow-hidden">
            <KanbanBoard />
          </section>
          <BoardAgentChat />
        </div>
      </BoardProvider>
    </div>
  );
}
