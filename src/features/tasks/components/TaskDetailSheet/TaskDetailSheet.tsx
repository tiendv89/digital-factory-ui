"use client";

import { useEffect, useId } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Layers,
  User,
  X,
} from "lucide-react";
import type { LogEntry, ParsedTask } from "@/services/yaml-parser";
import { formatTimestamp } from "@/lib/time";
import { tokenizeText } from "@/lib/url-tokenizer";
import {
  formatStatusLabel,
  getStatusStyle,
  type StatusBadgeStyle,
} from "../../lib/status";
import { clientStatusLabel } from "@/features/board/lib/status";

export type TaskDetailSheetProps = {
  task: ParsedTask | null;
  featureTitle?: string;
  repository?: string;
  nextAction?: string;
  onClose: () => void;
};

export function TaskDetailSheet({
  task,
  featureTitle,
  repository,
  nextAction,
  onClose,
}: TaskDetailSheetProps) {
  const open = task !== null;
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={
        "fixed inset-0 z-40 " +
        (open ? "pointer-events-auto" : "pointer-events-none")
      }
    >
      <button
        type="button"
        aria-label="Close task detail"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={
          "absolute inset-0 cursor-default bg-black/80 transition-opacity duration-200 " +
          (open ? "opacity-100" : "opacity-0")
        }
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={
          "absolute right-0 top-0 flex h-full w-full flex-col bg-surface shadow-xl transition-transform duration-200 ease-out " +
          "sm:max-w-md md:max-w-lg lg:max-w-xl " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        {task ? (
          <TaskDetailContents
            task={task}
            featureTitle={featureTitle}
            repository={repository}
            nextAction={nextAction}
            onClose={onClose}
            titleId={titleId}
            descId={descId}
          />
        ) : null}
      </aside>
    </div>
  );
}

type ContentsProps = {
  task: ParsedTask;
  featureTitle: string | undefined;
  repository: string | undefined;
  nextAction: string | undefined;
  onClose: () => void;
  titleId: string;
  descId: string;
};

function TaskDetailContents({
  task,
  featureTitle,
  repository,
  nextAction,
  onClose,
  titleId,
  descId,
}: ContentsProps) {
  const statusStyle = getStatusStyle(task.status);
  const lastUpdatedAt = task.execution?.last_updated_at;
  const actorType = task.execution?.actor_type;

  return (
    <>
      <DetailHeader
        task={task}
        featureTitle={featureTitle}
        statusStyle={statusStyle}
        onClose={onClose}
        titleId={titleId}
        descId={descId}
      />
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <PullRequestsSection task={task} />
        <MetadataSection
          task={task}
          repository={repository}
          nextAction={nextAction}
        />
        <ExecutionSection actorType={actorType} />
        <LastUpdatedSection lastUpdatedAt={lastUpdatedAt} />
        <TimelineSection log={task.log} />
      </div>
    </>
  );
}

function DetailHeader({
  task,
  featureTitle,
  statusStyle,
  onClose,
  titleId,
  descId,
}: {
  task: ParsedTask;
  featureTitle: string | undefined;
  statusStyle: StatusBadgeStyle;
  onClose: () => void;
  titleId: string;
  descId: string;
}) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-border bg-surface px-6 py-4">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-chip-bg px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {task.id}
          </span>
          <span
            className={
              "px-2 py-0.5 text-xs font-semibold uppercase tracking-wide " +
              statusStyle.bg +
              " " +
              statusStyle.text
            }
          >
            {clientStatusLabel(task.status)}
          </span>
        </div>
        <h2
          id={titleId}
          className="text-xl font-semibold leading-snug text-text-primary"
        >
          {task.title || task.id}
        </h2>
        {featureTitle ? (
          <p className="text-xs text-text-muted">{featureTitle}</p>
        ) : null}
        <p id={descId} className="sr-only">
          Task detail for {task.id}: {task.title}. Status: {task.status}.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="shrink-0 p-1 text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </header>
  );
}

function MetadataSection({
  task,
  repository,
  nextAction,
}: {
  task: ParsedTask;
  repository: string | undefined;
  nextAction: string | undefined;
}) {
  const repositoryUrl = repository ? `https://github.com/${repository}` : null;

  return (
    <section className="mt-6 border-t border-border pt-5">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">Details</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 pb-2">
      <MetaField
        icon={<Layers className="h-4 w-4" aria-hidden="true" />}
        label="Repository"
      >
        {repository && repositoryUrl ? (
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-primary transition-colors hover:underline"
            aria-label={`Open repository ${repository}`}
          >
            <span className="text-text-primary">{repository}</span>
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

      <MetaField
        icon={
          <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
        }
        label="Next Action"
      >
        {nextAction ? (
          <span className="text-text-primary">{nextAction}</span>
        ) : (
          <NoneValue />
        )}
      </MetaField>

      <MetaField label="Depends On" fullWidth>
        {task.dependsOn.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {task.dependsOn.map((dep) => (
              <span
                key={dep}
                className="bg-chip-bg px-2 py-0.5 text-xs font-medium text-text-secondary"
              >
                {dep}
              </span>
            ))}
          </div>
        ) : (
          <NoneValue />
        )}
      </MetaField>

      <MetaField
        icon={
          task.blockedReason ? (
            <AlertCircle className="h-4 w-4 text-danger" aria-hidden="true" />
          ) : null
        }
        label="Blocked Reason"
        fullWidth
      >
        {task.blockedReason ? (
          <div className="flex items-start gap-2 border border-danger bg-danger-bg px-3 py-2">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-danger"
              aria-hidden="true"
            />
            <span className="text-sm text-danger">{task.blockedReason}</span>
          </div>
        ) : (
          <NoneValue />
        )}
      </MetaField>

      <MetaField label="Blocked Context" fullWidth>
        {task.blockedContext ? (
          <pre className="whitespace-pre-wrap bg-yellow-bg px-3 py-2 text-xs text-yellow">
            {JSON.stringify(task.blockedContext, null, 2)}
          </pre>
        ) : (
          <NoneValue />
        )}
      </MetaField>
    </div>
    </section>
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

function PullRequestsSection({ task }: { task: ParsedTask }) {
  const workspacePrUrl = task.workspace_pr?.url ?? undefined;
  const repoPrUrl = task.pr?.url ?? task.workspace_pr?.url ?? undefined;

  return (
    <section className="pb-2">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Pull Requests
      </h3>
      <div className="flex flex-col gap-2">
        <PullRequestCard
          label="Workspace PR"
          url={workspacePrUrl}
          icon={<ExternalLink className="h-4 w-4" aria-hidden="true" />}
        />
        <PullRequestCard
          label="Repository PR"
          url={repoPrUrl}
          icon={<GitPullRequest className="h-4 w-4" aria-hidden="true" />}
        />
      </div>
    </section>
  );
}

function PullRequestCard({
  label,
  url,
  icon,
}: {
  label: string;
  url: string | undefined;
  icon: React.ReactNode;
}) {
  if (!url) {
    return (
      <div
        aria-disabled="true"
        className="pointer-events-none flex items-center justify-between border border-border bg-surface px-3 py-2.5 opacity-70"
      >
        <div className="flex items-center gap-2">
          <span className="text-text-muted">{icon}</span>
          <span className="text-sm font-medium text-text-secondary">
            {label}
          </span>
        </div>
        <span className="italic text-xs text-text-muted">None</span>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center justify-between border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary-light hover:bg-surface-subtle"
    >
      <div className="flex items-center gap-2">
        <span className="text-text-secondary">{icon}</span>
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <ExternalLink
          className="h-3.5 w-3.5 text-text-muted"
          aria-hidden="true"
        />
      </div>
    </a>
  );
}

function ExecutionSection({
  actorType,
}: {
  actorType: string | undefined;
}) {
  const ActorIcon = actorType === "agent" ? Bot : User;

  return (
    <section className="mt-6 border-t border-border pt-5">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Execution
      </h3>
      <div className="flex items-center gap-2">
        <ActorIcon className="h-4 w-4" aria-hidden="true" />
        <span className="capitalize text-sm text-text-primary">
          {actorType ?? "\u2014"}
        </span>
      </div>
    </section>
  );
}

function LastUpdatedSection({
  lastUpdatedAt,
}: {
  lastUpdatedAt: string | undefined;
}) {
  return (
    <section className="mt-6 border-t border-border pt-5">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Last Updated
      </h3>
      {lastUpdatedAt ? (
        <p className="text-sm text-text-primary">
          {formatTimestamp(lastUpdatedAt)}
        </p>
      ) : (
        <p className="text-sm italic text-text-muted">\u2014</p>
      )}
    </section>
  );
}

function TimelineSection({ log }: { log: LogEntry[] | undefined }) {
  const timelineEntries = getSortedTimelineEntries(log);

  return (
    <section className="mt-6 border-t border-border pt-5">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Activity Timeline
      </h3>
      {timelineEntries.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {timelineEntries.map((entry, index) => (
            <TimelineEntry
              key={`${entry.at}-${index}`}
              entry={entry}
              isLast={index === timelineEntries.length - 1}
            />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-text-muted">No activity logs available.</p>
      )}
    </section>
  );
}

function getSortedTimelineEntries(log: LogEntry[] | undefined): LogEntry[] {
  if (!log || log.length === 0) return [];

  return log
    .map((entry, sequence) => {
      const time = new Date(entry.at).getTime();
      return {
        entry,
        sequence,
        sortTime: Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time,
      };
    })
    .sort((a, b) => {
      if (a.sortTime !== b.sortTime) return b.sortTime - a.sortTime;
      return a.sequence - b.sequence;
    })
    .map(({ entry }) => entry);
}

function getTimelineStatusKey(action: string): string {
  if (action === "started" || action === "claimed") return "in_progress";
  if (action === "moved_to_review") return "in_review";
  return action;
}

function TimelineEntry({
  entry,
  isLast,
}: {
  entry: LogEntry;
  isLast: boolean;
}) {
  const statusStyle = getStatusStyle(getTimelineStatusKey(entry.action));

  return (
    <li data-task-timeline-entry className="flex gap-3">
      <div className="flex flex-col items-center pt-1">
        <span
          className={"h-2 w-2 rounded-full " + statusStyle.dot}
          aria-hidden="true"
        />
        {isLast ? null : (
          <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <TimelineStatusBadge
            action={entry.action}
            statusStyle={statusStyle}
          />
          <span className="text-xs text-text-muted">
            {formatTimestamp(entry.at)}
          </span>
        </div>
        <span className="text-xs text-text-muted">by {entry.by}</span>
        {entry.note ? (
          <p className="mt-1 text-sm text-text-secondary">
            <TimelineNoteText text={entry.note} />
          </p>
        ) : null}
      </div>
    </li>
  );
}

function TimelineNoteText({ text }: { text: string }) {
  const tokens = tokenizeText(text);
  return (
    <>
      {tokens.map((token, i) =>
        token.type === "link" ? (
          <a
            key={i}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:opacity-80"
            data-timeline-link
          >
            {token.label}
          </a>
        ) : (
          <span key={i}>{token.value}</span>
        ),
      )}
    </>
  );
}

function TimelineStatusBadge({
  action,
  statusStyle,
}: {
  action: string;
  statusStyle: StatusBadgeStyle;
}) {
  return (
    <span
      data-task-timeline-status={action}
      className={
        "border border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide " +
        statusStyle.bg +
        " " +
        statusStyle.text
      }
    >
      {formatStatusLabel(action)}
    </span>
  );
}
