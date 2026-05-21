"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Check,
  ClipboardCopy,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Layers,
  RefreshCw,
  User,
} from "lucide-react";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { useWorkspaceTask } from "../../hooks/useWorkspaceTask";
import { formatTimestamp } from "@/lib/time";
import {
  formatStatusLabel,
  getStatusStyle,
} from "../../lib/status";
import type { TaskDetail, PullRequestRef } from "@/services/workflow-backend/types";

export type TaskTabViewProps = {
  workspaceId: string;
  taskId: string;
};

export function TaskTabView({ workspaceId, taskId }: TaskTabViewProps) {
  const { task, loading, error, reload } = useWorkspaceTask(workspaceId, taskId);

  if (loading) {
    return (
      <div
        data-task-tab-loading
        className="flex flex-1 items-center justify-center"
      >
        <p className="text-sm text-text-muted">Loading task…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-task-tab-error
        className="flex flex-1 flex-col items-center justify-center gap-4"
      >
        <AlertCircle className="h-8 w-8 text-danger" aria-hidden="true" />
        <p className="text-sm text-text-secondary">
          {error.message || "Failed to load task."}
        </p>
        {error.retryable && (
          <button
            type="button"
            onClick={reload}
            className="flex items-center gap-2 border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-subtle"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!task) return null;

  return <TaskTabContent task={task} onReload={reload} />;
}

function TaskTabContent({
  task,
  onReload,
}: {
  task: TaskDetail;
  onReload: () => void;
}) {
  const { goToBoard } = useWorkspaceContext();
  const [copied, setCopied] = useState(false);
  const statusStyle = getStatusStyle(task.status);

  function handleCopyId() {
    const textToCopy = task.task_name || task.id;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    } else {
      const el = document.createElement("textarea");
      el.value = textToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div
      data-task-tab-content
      className="flex h-full flex-col overflow-hidden"
    >
      {/* Task tab header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-6 py-4">
        <button
          type="button"
          data-back-to-board
          onClick={goToBoard}
          aria-label="Back to board"
          className="flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Board
        </button>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <button
            type="button"
            data-copy-task-id
            onClick={handleCopyId}
            aria-label={`Copy task id ${task.task_name}`}
            title="Copy task ID"
            className="flex items-center gap-1 bg-chip-bg px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-text-secondary transition-colors hover:bg-primary-light hover:text-primary"
          >
            {task.task_name}
            {copied ? (
              <Check className="h-3 w-3 text-success" aria-hidden="true" />
            ) : (
              <ClipboardCopy className="h-3 w-3" aria-hidden="true" />
            )}
          </button>
          <span
            className={
              "px-2 py-0.5 text-xs font-semibold uppercase tracking-wide " +
              statusStyle.bg +
              " " +
              statusStyle.text
            }
          >
            {formatStatusLabel(task.status)}
          </span>
          <h1 className="min-w-0 truncate text-base font-semibold text-text-primary">
            {task.title || task.task_name}
          </h1>
        </div>
        <button
          type="button"
          onClick={onReload}
          aria-label="Reload task"
          className="shrink-0 p-1 text-text-secondary transition-colors hover:text-text-primary"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      {/* Task tab body — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <TaskMetadataSection task={task} />
          <TaskDependenciesSection task={task} />
          <TaskExecutionSection task={task} />
          <TaskPrRefsSection task={task} />
        </div>
      </div>
    </div>
  );
}

function TaskMetadataSection({ task }: { task: TaskDetail }) {
  const repoUrl = task.repo ? `https://github.com/${task.repo}` : null;

  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Details
      </h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        <MetaField
          icon={<Layers className="h-4 w-4" aria-hidden="true" />}
          label="Repository"
        >
          {task.repo && repoUrl ? (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-primary transition-colors hover:underline"
              aria-label={`Open repository ${task.repo}`}
            >
              <span className="text-text-primary">{task.repo}</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : (
            <NoneValue />
          )}
        </MetaField>

        <MetaField
          icon={<GitBranch className="h-4 w-4" aria-hidden="true" />}
          label="Branch"
        >
          {task.branch ? (
            <span className="break-all font-mono text-xs text-success">
              {task.branch}
            </span>
          ) : (
            <NoneValue />
          )}
        </MetaField>

        {task.blocked_reason && (
          <MetaField
            icon={
              <AlertCircle
                className="h-4 w-4 text-danger"
                aria-hidden="true"
              />
            }
            label="Blocked Reason"
            fullWidth
          >
            <div
              data-blocked-reason
              className="flex items-start gap-2 border border-danger bg-danger-bg px-3 py-2"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-danger"
                aria-hidden="true"
              />
              <span className="text-sm text-danger">{task.blocked_reason}</span>
            </div>
          </MetaField>
        )}
      </div>
    </section>
  );
}

function TaskDependenciesSection({ task }: { task: TaskDetail }) {
  if (!task.depends_on || task.depends_on.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Dependencies
      </h2>
      <div
        data-task-depends-on
        className="flex flex-wrap gap-2"
      >
        {task.depends_on.map((dep) => (
          <span
            key={dep}
            className="bg-chip-bg px-2 py-0.5 font-mono text-xs font-medium text-text-secondary"
          >
            {dep}
          </span>
        ))}
      </div>
    </section>
  );
}

function TaskExecutionSection({ task }: { task: TaskDetail }) {
  const { execution } = task;
  if (!execution) return null;

  const actorType = execution.actor_type;
  const ActorIcon = actorType === "agent" ? Bot : User;
  const lastUpdatedAt = execution.last_updated_at;
  const lastUpdatedBy = execution.last_updated_by;

  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Execution
      </h2>
      <div
        data-task-execution
        className="grid grid-cols-2 gap-x-8 gap-y-5"
      >
        <MetaField
          icon={<ActorIcon className="h-4 w-4" aria-hidden="true" />}
          label="Actor"
        >
          <span className="capitalize text-text-primary">
            {actorType || <NoneValue />}
          </span>
        </MetaField>

        {lastUpdatedBy && (
          <MetaField label="Last Updated By">
            <span className="text-text-primary">{lastUpdatedBy}</span>
          </MetaField>
        )}

        {lastUpdatedAt && (
          <MetaField label="Last Updated">
            <span className="text-text-primary">
              {formatTimestamp(lastUpdatedAt)}
            </span>
          </MetaField>
        )}
      </div>
    </section>
  );
}

function TaskPrRefsSection({ task }: { task: TaskDetail }) {
  const refs = task.pr_refs ?? [];
  const legacyPr = task.pr;
  const legacyWsPr = task.workspace_pr;

  const allRefs: PullRequestRef[] = [...refs];

  if (legacyPr?.url && !allRefs.some((r) => r.url === legacyPr.url)) {
    allRefs.push({
      label: "Repository PR",
      status: legacyPr.status ?? "",
      repo: task.repo ?? "",
      url: legacyPr.url,
    });
  }
  if (legacyWsPr?.url && !allRefs.some((r) => r.url === legacyWsPr.url)) {
    allRefs.push({
      label: "Workspace PR",
      status: legacyWsPr.status ?? "",
      repo: "",
      url: legacyWsPr.url,
    });
  }

  if (allRefs.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Pull Requests
      </h2>
      <div
        data-task-pr-refs
        className="flex flex-col gap-2"
      >
        {allRefs.map((ref) => (
          <PrRefCard key={ref.url} ref_={ref} />
        ))}
      </div>
    </section>
  );
}

function PrRefCard({ ref_ }: { ref_: PullRequestRef }) {
  return (
    <a
      href={ref_.url}
      target="_blank"
      rel="noreferrer noopener"
      data-pr-ref={ref_.url}
      className="flex items-center justify-between border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary-light hover:bg-surface-subtle"
    >
      <div className="flex items-center gap-2">
        <GitPullRequest
          className="h-4 w-4 text-text-secondary"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-text-primary">
          {ref_.label || ref_.repo || "PR"}
        </span>
        {ref_.status && (
          <span className="rounded bg-chip-bg px-1.5 text-[10px] font-medium uppercase text-text-secondary">
            {ref_.status}
          </span>
        )}
      </div>
      <ExternalLink
        className="h-3.5 w-3.5 text-text-muted"
        aria-hidden="true"
      />
    </a>
  );
}

function MetaField({
  icon,
  label,
  fullWidth,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={"flex flex-col gap-1.5 " + (fullWidth ? "col-span-2" : "")}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function NoneValue() {
  return <span className="italic text-text-muted">None</span>;
}
