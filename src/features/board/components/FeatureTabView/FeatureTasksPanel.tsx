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
import { formatStatusLabel, getStatusStyle } from "@/features/tasks/lib/status";
import { MarkdownBlock } from "./MarkdownBlock";
import type { FeatureDetail, TaskSummary } from "@/services/workflow-backend/types";

type TaskSubView = "list" | "markdown";

type FeatureTasksPanelProps = {
  feature: FeatureDetail;
  onDrilldown: (taskId: string) => void;
};

export function FeatureTasksPanel({ feature, onDrilldown }: FeatureTasksPanelProps) {
  const [subView, setSubView] = useState<TaskSubView>("list");
  const tasks = feature.tasks ?? [];

  const tasksDoc = (feature.documents ?? []).find(
    (d) => d.document_type === "tasks",
  );

  const { content: tasksMarkdown, loading: mdLoading } = useDocumentContent(
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
                onDrilldown={() => onDrilldown(task.id)}
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
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 border border-border bg-surface px-4 py-8">
              <p className="text-sm text-text-muted">
                No Task Docs document available.
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
  onDrilldown,
}: {
  task: TaskSummary;
  onDrilldown: () => void;
}) {
  const statusStyle = getStatusStyle(task.status);

  return (
    <button
      type="button"
      data-feature-task-row={task.task_name}
      onClick={onDrilldown}
      aria-label={`Open task ${task.task_name}`}
      className="flex w-full min-w-0 items-center gap-3 border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-primary-light hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
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
        {formatStatusLabel(task.status)}
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
    </button>
  );
}
