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
import { getStatusColor } from "@/features/board/lib/status";
import { formatStatusLabel, getStatusStyle } from "../../lib/status";
import type {
  TaskDetail,
  PullRequestRef,
} from "@/services/workflow-backend/types";

export type TaskTabViewProps = {
  workspaceId: string;
  taskId: string;
};

type PullRequestRefWithUrl = PullRequestRef & { url: string };

export function TaskTabView({ workspaceId, taskId }: TaskTabViewProps) {
  const { task, loading, error, reload } = useWorkspaceTask(
    workspaceId,
    taskId,
  );

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
  const { activeTaskTabId, closeTaskTab, goToBoard } = useWorkspaceContext();
  const [copied, setCopied] = useState(false);
  const statusColor = getStatusColor(task.status);

  function handleBackToBoard() {
    if (activeTaskTabId) {
      closeTaskTab(activeTaskTabId);
      return;
    }
    goToBoard();
  }

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
      className="flex h-full min-h-0 flex-col overflow-hidden bg-bg"
    >
      <header className="shrink-0 border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            data-back-to-board
            onClick={handleBackToBoard}
            aria-label="Back to board"
            className="flex h-8 items-center gap-1.5 border border-border bg-surface px-3 text-xs text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            onClick={onReload}
            aria-label="Reload task"
            className="shrink-0 p-1 text-text-secondary transition-colors hover:text-text-primary"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 flex min-w-0 items-start gap-2">
          <h1 className="min-w-0 text-xl font-semibold leading-7 text-text-primary">
            {task.title || task.task_name}
          </h1>
          <button
            type="button"
            data-copy-task-id
            onClick={handleCopyId}
            aria-label={`Copy task id ${task.task_name}`}
            title="Copy task ID"
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            ) : (
              <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-chip-bg px-2 py-1 font-mono font-semibold text-text-secondary">
            {task.task_name}
          </span>
          <span
            className="px-2 py-1 font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `${statusColor}18`, color: statusColor }}
          >
            {formatStatusLabel(task.status).toUpperCase()}
          </span>
          {task.execution?.last_updated_at && (
            <span className="text-text-muted">
              Updated {formatTimestamp(task.execution.last_updated_at)}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface-secondary/40 px-6 py-6">
        <div className="max-w-5xl space-y-8">
          <TaskMetadataSection task={task} />
          <TaskDependenciesSection task={task} />
          <TaskExecutionSection task={task} />
          <TaskPrRefsSection task={task} />
          <TaskActivityTimelineSection task={task} />
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
              <AlertCircle className="h-4 w-4 text-danger" aria-hidden="true" />
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
      <div data-task-depends-on className="flex flex-wrap gap-2">
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
      <div data-task-execution className="grid grid-cols-2 gap-x-8 gap-y-5">
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

type PrEntry = {
  label: string;
  repo?: string | null;
  url?: string | null;
  status?: string | null;
};

function TaskPrRefsSection({ task }: { task: TaskDetail }) {
  // Build a map of known URLs from pr_refs for dedup
  const prRefsEntries: PrEntry[] = (task.pr_refs ?? []).map((ref) => ({
    label: ref.label || ref.repo || "PR",
    repo: ref.repo,
    url: ref.url,
    status: ref.status,
  }));

  const knownUrls = new Set(prRefsEntries.map((e) => e.url).filter(Boolean));

  // Always show Repository PR slot
  const legacyPr = task.pr;
  const repoPrEntry: PrEntry =
    legacyPr && legacyPr.url && !knownUrls.has(legacyPr.url)
      ? {
          label: "Repository PR",
          repo: task.repo,
          url: legacyPr.url,
          status: legacyPr.status,
        }
      : (prRefsEntries.find((e) => e.url && e.label !== "Workspace PR") ?? {
          label: "Repository PR",
          url: undefined,
        });

  // Always show Workspace PR slot
  const legacyWsPr = task.workspace_pr;
  const workspacePrEntry: PrEntry =
    legacyWsPr && legacyWsPr.url && !knownUrls.has(legacyWsPr.url)
      ? {
          label: "Workspace PR",
          url: legacyWsPr.url,
          status: legacyWsPr.status,
        }
      : (prRefsEntries.find((e) => e.url && e.label === "Workspace PR") ?? {
          label: "Workspace PR",
          url: undefined,
        });

  // Extra pr_refs beyond the two fixed slots
  const extraRefs = prRefsEntries.filter(
    (e) => e.url !== repoPrEntry.url && e.url !== workspacePrEntry.url,
  );

  const allEntries: PrEntry[] = [repoPrEntry, workspacePrEntry, ...extraRefs];

  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Pull Requests
      </h2>
      <div data-task-pr-refs className="flex flex-col gap-2">
        {allEntries.map((entry, i) => (
          <PrRefCard key={entry.url ?? `empty-${i}`} entry={entry} />
        ))}
      </div>
    </section>
  );
}

type TaskActivityTimelineEntry = NonNullable<TaskDetail["activity"]>[number] & {
  sortTime: number;
  sequence: number;
};

function TaskActivityTimelineSection({ task }: { task: TaskDetail }) {
  const entries = getSortedTaskActivityEntries(task.activity);

  return (
    <section>
      <h2 className="mb-4 border-b border-border pb-3 text-sm font-semibold text-text-primary">
        Activity Timeline
      </h2>
      {entries.length > 0 ? (
        <ol data-task-activity-timeline className="flex flex-col gap-0">
          {entries.map((entry, index) => (
            <TaskActivityTimelineItem
              key={`${entry.occurred_at}-${entry.action}-${index}`}
              entry={entry}
              isLast={index === entries.length - 1}
            />
          ))}
        </ol>
      ) : (
        <p className="text-sm italic text-text-muted">
          No activity logs available.
        </p>
      )}
    </section>
  );
}

function getSortedTaskActivityEntries(
  activity: TaskDetail["activity"],
): TaskActivityTimelineEntry[] {
  if (!activity || activity.length === 0) return [];

  return activity
    .map((entry, sequence) => {
      const entryTime = new Date(entry.occurred_at).getTime();
      return {
        ...entry,
        sequence,
        sortTime: Number.isNaN(entryTime)
          ? Number.NEGATIVE_INFINITY
          : entryTime,
      };
    })
    .sort((a, b) => {
      if (a.sortTime !== b.sortTime) return b.sortTime - a.sortTime;
      return a.sequence - b.sequence;
    });
}

function getTimelineStatusKey(action: string): string {
  if (action === "started" || action === "claimed") return "in_progress";
  if (action === "moved_to_review") return "in_review";
  return action;
}

function TaskActivityTimelineItem({
  entry,
  isLast,
}: {
  entry: TaskActivityTimelineEntry;
  isLast: boolean;
}) {
  const statusStyle = getStatusStyle(getTimelineStatusKey(entry.action));

  return (
    <li data-task-timeline-entry className="flex gap-4">
      <div className="flex flex-col items-center pt-1">
        <span
          className={"h-1.5 w-1.5 rounded-full " + statusStyle.dot}
          aria-hidden="true"
        />
        {isLast ? null : (
          <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pb-5">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <span className="text-sm font-semibold capitalize text-text-primary">
            {formatStatusLabel(entry.action)}
          </span>
          <span className="shrink-0 text-xs text-text-muted">
            {formatTimestamp(entry.occurred_at)}
          </span>
        </div>
        <span className="text-xs text-text-muted">by {entry.actor}</span>
        {entry.note ? (
          <p className="mt-2 border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            {entry.note}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function getPrStatusStyle(status: string): { bg: string; color: string } {
  switch (status.toLowerCase()) {
    case "merged":
      return { bg: "#8250df1a", color: "#8250df" };
    case "open":
      return { bg: "#1a7f371a", color: "#1a7f37" };
    case "closed":
      return { bg: "#cf222e1a", color: "#cf222e" };
    default:
      return { bg: "transparent", color: "var(--color-text-secondary)" };
  }
}

function PrRefCard({ entry }: { entry: PrEntry }) {
  const label = entry.label || entry.repo || "PR";
  const hasUrl = typeof entry.url === "string" && entry.url.length > 0;

  if (hasUrl) {
    const statusStyle = entry.status ? getPrStatusStyle(entry.status) : null;
    return (
      <a
        href={entry.url!}
        target="_blank"
        rel="noreferrer noopener"
        data-pr-ref={entry.url}
        className="flex items-center justify-between border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary-light hover:bg-surface-subtle"
      >
        <div className="flex items-center gap-2">
          <GitPullRequest className="h-4 w-4 text-success" aria-hidden="true" />
          <span className="text-sm font-medium text-text-primary">{label}</span>
          {entry.status && statusStyle && (
            <span
              className="rounded px-1.5 text-[10px] font-semibold uppercase"
              style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.color,
              }}
            >
              {entry.status}
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

  return (
    <div
      aria-disabled="true"
      className="pointer-events-none flex items-center justify-between border border-border bg-surface px-3 py-2.5 opacity-70"
    >
      <div className="flex items-center gap-2">
        <span className="text-text-muted">
          <GitPullRequest className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-sm font-medium text-text-secondary">{label}</span>
      </div>
      <span className="italic text-xs text-text-muted">None</span>
    </div>
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
    <div className={"flex flex-col gap-1.5 " + (fullWidth ? "col-span-2" : "")}>
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
