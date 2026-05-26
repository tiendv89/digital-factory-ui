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
import { useFeatureTask } from "../../hooks/useFeatureDetail";
import { formatTimestamp } from "@/lib/time";
import { formatStatusLabel, getStatusStyle } from "@/features/tasks/lib/status";
import { getStatusColor } from "@/features/board/lib/status";
import type {
  PullRequestRef,
  TaskDetail,
} from "@/services/workflow-backend/types";

type PullRequestRefWithUrl = PullRequestRef & { url: string };

export function FeatureTaskDrilldown({
  workspaceId,
  featureId,
  taskId,
  onBack,
}: {
  workspaceId: string;
  featureId: string;
  taskId: string;
  onBack: () => void;
}) {
  const { task, loading, error, reload } = useFeatureTask(
    workspaceId,
    featureId,
    taskId,
  );

  if (loading) {
    return (
      <div
        data-feature-task-drilldown-loading
        className="flex flex-1 items-center justify-center"
      >
        <p className="text-sm text-text-muted">Loading task…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-feature-task-drilldown-error
        className="flex flex-1 flex-col items-center justify-center gap-4"
      >
        <AlertCircle className="h-8 w-8 text-danger" aria-hidden="true" />
        <p className="text-sm text-text-secondary">
          {error.message || "Failed to load task."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to feature
          </button>
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
      </div>
    );
  }

  if (!task) return null;

  return <DrilldownTaskContent task={task} onBack={onBack} onReload={reload} />;
}

export function DrilldownTaskContent({
  task,
  onBack,
  onReload,
}: {
  task: TaskDetail;
  onBack: () => void;
  onReload: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const statusColor = getStatusColor(task.status);

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
      data-feature-task-drilldown-content
      className="flex h-full min-h-0 flex-col overflow-hidden bg-bg"
    >
      <header className="shrink-0 border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            data-back-to-feature
            onClick={onBack}
            aria-label="Back to feature"
            className="flex h-8 items-center gap-1.5 border border-border bg-surface px-3 text-xs text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to feature
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
          <DrilldownMetadataSection task={task} />
          <DrilldownDependenciesSection task={task} />
          <DrilldownExecutionSection task={task} />
          <DrilldownPrRefsSection task={task} />
          <DrilldownActivityTimelineSection task={task} />
        </div>
      </div>
    </div>
  );
}

function DrilldownMetadataSection({ task }: { task: TaskDetail }) {
  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Details
      </h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary">
            <Layers className="h-4 w-4" aria-hidden="true" />
            <span>Repository</span>
          </div>
          <div className="text-sm">
            {task.repo ? (
              <span className="text-text-primary">{task.repo}</span>
            ) : (
              <span className="italic text-text-muted">None</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary">
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            <span>Branch</span>
          </div>
          <div className="text-sm">
            {task.branch ? (
              <span className="break-all font-mono text-xs text-success">
                {task.branch}
              </span>
            ) : (
              <span className="italic text-text-muted">None</span>
            )}
          </div>
        </div>

        {task.blocked_reason && (
          <div className="col-span-2 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary">
              <AlertCircle className="h-4 w-4 text-danger" aria-hidden="true" />
              <span>Blocked Reason</span>
            </div>
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
          </div>
        )}
      </div>
    </section>
  );
}

function DrilldownDependenciesSection({ task }: { task: TaskDetail }) {
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

function DrilldownExecutionSection({ task }: { task: TaskDetail }) {
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
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary">
            <ActorIcon className="h-4 w-4" aria-hidden="true" />
            <span>Actor</span>
          </div>
          <div className="text-sm">
            <span className="capitalize text-text-primary">
              {actorType || (
                <span className="italic text-text-muted">None</span>
              )}
            </span>
          </div>
        </div>

        {lastUpdatedBy && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary">
              <span>Last Updated By</span>
            </div>
            <div className="text-sm">
              <span className="text-text-primary">{lastUpdatedBy}</span>
            </div>
          </div>
        )}

        {lastUpdatedAt && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary">
              <span>Last Updated</span>
            </div>
            <div className="text-sm">
              <span className="text-text-primary">
                {formatTimestamp(lastUpdatedAt)}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function DrilldownPrRefsSection({ task }: { task: TaskDetail }) {
  const refs: PullRequestRefWithUrl[] = (task.pr_refs ?? []).filter(
    (ref): ref is PullRequestRefWithUrl =>
      typeof ref.url === "string" && ref.url.length > 0,
  );
  const legacyPr = task.pr;
  const legacyWsPr = task.workspace_pr;

  const allRefs: PullRequestRefWithUrl[] = [...refs];
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
      <div data-task-pr-refs className="flex flex-col gap-2">
        {allRefs.map((ref) => (
          <a
            key={ref.url}
            href={ref.url}
            target="_blank"
            rel="noreferrer noopener"
            data-pr-ref={ref.url}
            className="flex items-center justify-between border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary-light hover:bg-surface-subtle"
          >
            <div className="flex items-center gap-2">
              <GitPullRequest
                className="h-4 w-4 text-text-secondary"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-text-primary">
                {ref.label || ref.repo || "PR"}
              </span>
            </div>
            <ExternalLink
              className="h-3.5 w-3.5 text-text-muted"
              aria-hidden="true"
            />
          </a>
        ))}
      </div>
    </section>
  );
}

type DrilldownActivityEntry = NonNullable<TaskDetail["activity"]>[number] & {
  sortTime: number;
  sequence: number;
};

function DrilldownActivityTimelineSection({ task }: { task: TaskDetail }) {
  const entries = getSortedDrilldownActivity(task.activity);

  return (
    <section>
      <h2 className="mb-4 border-b border-border pb-3 text-sm font-semibold text-text-primary">
        Activity Timeline
      </h2>
      {entries.length > 0 ? (
        <ol data-task-activity-timeline className="flex flex-col gap-0">
          {entries.map((entry, index) => (
            <DrilldownActivityItem
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

function getSortedDrilldownActivity(
  activity: TaskDetail["activity"],
): DrilldownActivityEntry[] {
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

function DrilldownActivityItem({
  entry,
  isLast,
}: {
  entry: DrilldownActivityEntry;
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
