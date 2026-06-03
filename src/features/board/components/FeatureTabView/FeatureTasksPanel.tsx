"use client";

import { useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  FileText,
  List,
  RefreshCw,
} from "lucide-react";
import { useDocumentContent } from "../../hooks/useDocumentContent";
import { getStatusStyle } from "@/features/tasks/lib/status";
import { clientStatusLabel } from "@/features/board/lib/status";
import { MarkdownBlock } from "./MarkdownBlock";
import type { FeatureDetail, TaskSummary } from "@/services/workflow-backend/types";

type TaskSubView = "list" | "markdown";

type FeatureTasksPanelProps = {
  feature: FeatureDetail;
  onOpenTaskTab: (taskId: string, taskName: string, title: string) => void;
};

export function FeatureTasksPanel({ feature, onOpenTaskTab }: FeatureTasksPanelProps) {
  const [subView, setSubView] = useState<TaskSubView>("list");
  const tasks = feature.tasks ?? [];

  const tasksDoc = (feature.documents ?? []).find(
    (d) => d.document_type === "tasks_md",
  );

  const {
    content: tasksMarkdown,
    loading: mdLoading,
    error: mdError,
  } = useDocumentContent(
    subView === "markdown" ? tasksDoc?.url : undefined,
    subView === "markdown" ? tasksDoc?.content : undefined,
  );

  return (
    <div className="w-1/2 px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-text-secondary" aria-hidden="true" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-primary">
            Feature Tasks
          </h2>
          <span className="border border-border bg-surface-secondary px-1.5 py-0.5 font-mono text-xs text-text-muted">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center border border-border bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setSubView("list")}
            className={
              "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors " +
              (subView === "list"
                ? "rounded bg-success text-white"
                : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary")
            }
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            Tasks List
          </button>
          <button
            type="button"
            onClick={() => setSubView("markdown")}
            className={
              "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors " +
              (subView === "markdown"
                ? "rounded bg-success text-white"
                : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary")
            }
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Task Docs
          </button>
        </div>
      </div>

      {subView === "list" ? (
        tasks.length === 0 ? (
          <div
            data-feature-tasks-empty
            className="flex flex-col items-center justify-center gap-2 py-20"
          >
            <p className="text-sm text-text-muted">No tasks in this feature.</p>
          </div>
        ) : (
          <div data-feature-tasks-list className="space-y-2">
            {tasks.map((task) => (
              <FeatureTaskRow
                key={task.id}
                task={task}
                onOpenTaskTab={() =>
                  onOpenTaskTab(
                    task.id,
                    task.task_name || task.id,
                    task.title || task.task_name || "",
                  )
                }
              />
            ))}
          </div>
        )
      ) : (
        <div data-feature-tasks-markdown>
          {mdLoading ? (
            <div className="flex items-center gap-2 py-8">
              <RefreshCw
                className="h-4 w-4 animate-spin text-text-muted"
                aria-hidden="true"
              />
              <p className="text-sm text-text-muted">Loading Task Docs…</p>
            </div>
          ) : tasksMarkdown ? (
            <div className="border border-border bg-surface px-6 py-5">
              <MarkdownBlock content={tasksMarkdown} />
            </div>
          ) : mdError ? (
            <div
              data-feature-tasks-doc-error
              className="flex flex-col gap-2 border border-danger/30 bg-danger-bg px-4 py-4"
            >
              <div className="flex items-center gap-2">
                <AlertCircle
                  className="h-4 w-4 shrink-0 text-danger"
                  aria-hidden="true"
                />
                <p className="text-sm text-danger">
                  Failed to load Task Docs content.
                </p>
              </div>
              {tasksDoc?.url && (
                <a
                  href={tasksDoc.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 text-xs text-primary transition-colors hover:underline"
                >
                  Open in GitHub
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
          ) : (
            <div
              data-feature-tasks-doc-empty
              className="flex flex-col items-center justify-center gap-2 border border-border bg-surface px-4 py-8"
            >
              <p className="text-sm text-text-muted">
                {tasksDoc
                  ? "No Task Docs content available."
                  : "No Task Docs document available."}
              </p>
              {tasksDoc?.url && (
                <a
                  href={tasksDoc.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 text-xs text-primary transition-colors hover:underline"
                >
                  Open in GitHub
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeatureTaskRow({
  task,
  onOpenTaskTab,
}: {
  task: TaskSummary;
  onOpenTaskTab: () => void;
}) {
  const statusStyle = getStatusStyle(task.status);

  return (
    <button
      type="button"
      data-feature-task-row={task.task_name}
      onClick={onOpenTaskTab}
      aria-label={`Open task ${task.task_name}`}
      className="flex w-full min-w-0 flex-col gap-1 border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-primary-light hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex w-full min-w-0 items-center gap-3">
        <span className="shrink-0 bg-chip-bg px-2 py-0.5 font-mono text-xs font-semibold text-text-secondary">
          {task.task_name}
        </span>
        <span
          className={
            "shrink-0 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide " +
            statusStyle.bg +
            " " +
            statusStyle.text
          }
        >
          {clientStatusLabel(task.status)}
        </span>
        <span className="min-w-0 truncate text-sm font-medium text-text-primary">
          {task.title || task.task_name}
        </span>
        {task.is_blocked && (
          <AlertCircle
            className="ml-auto h-3.5 w-3.5 shrink-0 text-danger"
            aria-hidden="true"
          />
        )}
      </div>
      {task.status === "blocked" && task.blocked_reason ? (
        <p data-blocked-reason className="text-xs text-danger">
          {task.blocked_reason}
        </p>
      ) : null}
    </button>
  );
}
