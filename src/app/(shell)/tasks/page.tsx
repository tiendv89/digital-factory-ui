"use client";

import { AlertCircle, GitPullRequest } from "lucide-react";

import { TaskReviewView } from "@/components/tasks/task-review-view";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-secondary ${className ?? ""}`} />;
}

function LoadingState() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <div className="flex h-[52px] shrink-0 items-center gap-4 border-b border-border px-6">
        <SkeletonBlock className="h-4 w-32" />
        <div className="flex-1" />
        <SkeletonBlock className="h-[30px] w-24 rounded-lg" />
      </div>
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-6">
        <div className="flex w-72 shrink-0 flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-4">
              <SkeletonBlock className="mb-2 h-3 w-3/4" />
              <SkeletonBlock className="mb-3 h-2 w-1/2" />
              <div className="flex gap-1.5">
                <SkeletonBlock className="h-5 w-14 rounded-full" />
                <SkeletonBlock className="h-5 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <SkeletonBlock className="h-8 w-2/3 rounded-md" />
          <SkeletonBlock className="h-3 w-1/3" />
          <div className="mt-2 flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBlock key={i} className={`h-3 ${i % 3 === 0 ? "w-2/3" : "w-full"}`} />
            ))}
          </div>
        </div>
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

function EmptyReview() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 bg-bg">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface">
        <GitPullRequest className="h-5 w-5 text-text-muted" />
      </div>
      <p className="text-[13px] font-medium text-text-secondary">No tasks in review</p>
      <p className="text-[11px] text-text-muted">Tasks moved to review will appear here</p>
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
