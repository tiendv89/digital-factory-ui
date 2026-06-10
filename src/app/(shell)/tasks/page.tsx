"use client";

import { AlertCircle } from "lucide-react";

import { TaskReviewView } from "@/components/tasks/task-review-view";
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

function EmptyReview() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center" style={{ backgroundColor: "#1e1e1e" }}>
      <p style={{ fontSize: 13, color: "#858585" }}>No tasks in review.</p>
    </div>
  );
}

export default function TasksPage() {
  const { activeWorkspace, loadingWorkspace, workspaceError } = useWorkspaceContext();

  if (loadingWorkspace) return <LoadingState />;
  if (workspaceError) return <ErrorState message={workspaceError.message || "Failed to load workspace."} />;
  if (!activeWorkspace) return <LoadingState />;

  const reviewTask = activeWorkspace.tasks.find((t) => t.status === "in_review" || t.status === "reviewing") ?? activeWorkspace.tasks[0] ?? null;

  if (!reviewTask) return <EmptyReview />;

  return (
    <div data-tasks-page className="flex h-full flex-col overflow-hidden">
      <TaskReviewView task={reviewTask} />
    </div>
  );
}
