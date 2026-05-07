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
import {
  formatStatusLabel,
  getStatusStyle,
  type StatusBadgeStyle,
} from "../../lib/status";

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
        "pointer-events-none fixed inset-0 z-40 " +
        (open ? "pointer-events-auto" : "")
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
        <MetadataSection
          task={task}
          repository={repository}
          nextAction={nextAction}
          lastUpdatedAt={lastUpdatedAt}
        />
        <PullRequestsSection task={task} />
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
          <span className="rounded-md bg-chip-bg px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {task.id}
          </span>
          <span
            className={
              "rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide " +
              statusStyle.bg +
              " " +
              statusStyle.text
            }
          >
            {formatStatusLabel(task.status)}
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
        className="shrink-0 rounded p-1 text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
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
  lastUpdatedAt,
}: {
  task: ParsedTask;
  repository: string | undefined;
  nextAction: string | undefined;
  lastUpdatedAt: string | undefined;
}) {
  const actorType = task.execution?.actor_type;
  const ActorIcon = actorType === "agent" ? Bot : User;

  return (
    <section className="grid grid-cols-2 gap-x-6 gap-y-5 pb-2">
      <MetaField
        icon={<Layers className="h-4 w-4" aria-hidden="true" />}
        label="Repository"
      >
        {repository ? (
          <span className="text-text-primary">{repository}</span>
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

      <MetaField
        icon={<ActorIcon className="h-4 w-4" aria-hidden="true" />}
        label="Executed By"
      >
        <div className="flex flex-col">
          <span className="capitalize text-text-primary">
            {actorType ?? "—"}
          </span>
          {lastUpdatedAt ? (
            <span className="mt-1 text-xs text-text-muted">
              {formatTimestamp(lastUpdatedAt)}
            </span>
          ) : null}
        </div>
      </MetaField>

      <MetaField label="Depends On" fullWidth>
        {task.dependsOn.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {task.dependsOn.map((dep) => (
              <span
                key={dep}
                className="rounded bg-chip-bg px-2 py-0.5 text-xs font-medium text-text-secondary"
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
            <AlertCircle
              className="h-4 w-4 text-danger"
              aria-hidden="true"
            />
          ) : null
        }
        label="Blocked Reason"
        fullWidth
      >
        {task.blockedReason ? (
          <div className="flex items-start gap-2 rounded-lg border border-danger bg-danger-bg px-3 py-2">
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
          <pre className="whitespace-pre-wrap rounded-lg bg-yellow-bg px-3 py-2 text-xs text-yellow">
            {JSON.stringify(task.blockedContext, null, 2)}
          </pre>
        ) : (
          <NoneValue />
        )}
      </MetaField>
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
  const workspacePrStatus = task.workspace_pr?.status ?? undefined;
  const repoPrUrl = task.pr?.url ?? undefined;
  const repoPrStatus = task.pr?.status ?? undefined;

  return (
    <section className="mt-6 border-t border-border pt-5">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Pull Requests
      </h3>
      <div className="flex flex-col gap-2">
        <PullRequestCard
          label="Workspace PR"
          url={workspacePrUrl}
          status={workspacePrStatus}
          icon={<ExternalLink className="h-4 w-4" aria-hidden="true" />}
        />
        <PullRequestCard
          label="Repository PR"
          url={repoPrUrl}
          status={repoPrStatus}
          icon={<GitPullRequest className="h-4 w-4" aria-hidden="true" />}
        />
      </div>
    </section>
  );
}

function PrStatusBadge({ status }: { status: string }) {
  const isOpen = status.toLowerCase() === "open";
  return (
    <span
      className={
        "rounded px-1.5 py-0.5 text-xs font-medium " +
        (isOpen
          ? "bg-success-bg text-success"
          : "bg-muted-bg text-text-muted")
      }
    >
      {status}
    </span>
  );
}

function PullRequestCard({
  label,
  url,
  status,
  icon,
}: {
  label: string;
  url: string | undefined;
  status: string | undefined;
  icon: React.ReactNode;
}) {
  if (!url) {
    return (
      <div
        aria-disabled="true"
        className="pointer-events-none flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 opacity-70"
      >
        <div className="flex items-center gap-2">
          <span className="text-text-muted">{icon}</span>
          <span className="text-sm font-medium text-text-secondary">{label}</span>
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
      className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary-light hover:bg-surface-subtle"
    >
      <div className="flex items-center gap-2">
        <span className="text-text-secondary">{icon}</span>
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {status ? <PrStatusBadge status={status} /> : null}
        <ExternalLink
          className="h-3.5 w-3.5 text-text-muted"
          aria-hidden="true"
        />
      </div>
    </a>
  );
}

function TimelineSection({ log }: { log: LogEntry[] | undefined }) {
  return (
    <section className="mt-6 border-t border-border pt-5">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Activity Timeline
      </h3>
      {log && log.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {log.map((entry, index) => (
            <TimelineEntry
              key={`${entry.at}-${index}`}
              entry={entry}
              isLast={index === log.length - 1}
            />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-text-muted">No activity logs available.</p>
      )}
    </section>
  );
}

function getTimelineDotClass(action: string): string {
  if (action === "blocked") return "bg-danger";
  if (action === "cancelled") return "bg-text-muted";
  if (action === "done") return "bg-success";
  return "bg-text-secondary";
}

function TimelineEntry({
  entry,
  isLast,
}: {
  entry: LogEntry;
  isLast: boolean;
}) {
  const dotClass = getTimelineDotClass(entry.action);

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center pt-1">
        <span
          className={"h-2 w-2 rounded-full " + dotClass}
          aria-hidden="true"
        />
        {isLast ? null : (
          <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium capitalize text-text-primary">
            {formatStatusLabel(entry.action)}
          </span>
          <span className="text-xs text-text-muted">
            {formatTimestamp(entry.at)}
          </span>
        </div>
        <span className="text-xs text-text-muted">by {entry.by}</span>
        {entry.note ? (
          <p className="mt-1 text-sm text-text-secondary">{entry.note}</p>
        ) : null}
      </div>
    </li>
  );
}
