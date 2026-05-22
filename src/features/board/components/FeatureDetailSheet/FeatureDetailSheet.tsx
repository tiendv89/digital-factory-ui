"use client";

import { useEffect, useId } from "react";
import {
  ArrowRight,
  Clock3,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  X,
} from "lucide-react";
import type {
  LogEntry,
  ParsedFeature,
  ParsedTask,
} from "@/services/yaml-parser";
import { formatTimestamp, getFeatureLastModifiedAt } from "@/lib/time";
import {
  formatStatusLabel,
  getStatusStyle,
  type StatusBadgeStyle,
} from "@/features/tasks/lib/status";
import {
  getFeatureStatusColor,
  getFeatureStatusLabel,
} from "../../lib/status";

export type FeatureDetailSheetProps = {
  feature: ParsedFeature | null;
  onClose: () => void;
};

export function FeatureDetailSheet({
  feature,
  onClose,
}: FeatureDetailSheetProps) {
  const open = feature !== null;
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
        aria-label="Close feature detail"
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
        {feature ? (
          <FeatureDetailContents
            feature={feature}
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
  feature: ParsedFeature;
  onClose: () => void;
  titleId: string;
  descId: string;
};

function FeatureDetailContents({
  feature,
  onClose,
  titleId,
  descId,
}: ContentsProps) {
  const statusLabel = getFeatureStatusLabel(feature.featureStatus);
  const statusColor = getFeatureStatusColor(feature.featureStatus);
  const lastModifiedAt = getFeatureLastModifiedAt(feature);

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-border bg-surface px-6 py-5">
        <div className="flex min-w-0 flex-col gap-3">
          <FeatureDetailTitle
            feature={feature}
            statusColor={statusColor}
            statusLabel={statusLabel}
            titleId={titleId}
            descId={descId}
            lastModifiedAt={lastModifiedAt}
          />
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
      <div className="flex-1 overflow-y-auto bg-bg px-6 py-6">
        <TasksSection tasks={feature.tasks} />
        <ActivityTimelineSection feature={feature} />
      </div>
    </>
  );
}

function FeatureDetailTitle({
  feature,
  statusColor,
  statusLabel,
  titleId,
  descId,
  lastModifiedAt,
}: {
  feature: ParsedFeature;
  statusColor: string;
  statusLabel: string;
  titleId: string;
  descId: string;
  lastModifiedAt: string | null;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="bg-chip-bg px-2 py-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {feature.id}
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
          style={{ backgroundColor: statusColor + "22", color: statusColor }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: statusColor }}
            aria-hidden="true"
          />
          {statusLabel}
        </span>
      </div>
      <h2
        id={titleId}
        className="text-xl font-semibold leading-snug text-text-primary"
      >
        {feature.title || feature.id}
      </h2>
      {lastModifiedAt ? (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Modified {formatTimestamp(lastModifiedAt)}</span>
        </p>
      ) : (
        <p className="text-sm italic text-text-muted">None</p>
      )}
      <p id={descId} className="sr-only">
        Feature detail for {feature.id}: {feature.title}. Status: {statusLabel}.
      </p>
    </>
  );
}

function TasksSection({ tasks }: { tasks: ParsedTask[] }) {
  return (
    <section>
      <h3 className="text-base font-semibold text-text-primary">Tasks</h3>
      <div className="mt-2 border-t border-border pt-3">
        {tasks.length > 0 ? (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <FeatureTaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <p className="py-3 text-sm italic text-text-muted">
            No tasks available.
          </p>
        )}
      </div>
    </section>
  );
}

function FeatureTaskCard({ task }: { task: ParsedTask }) {
  const updatedAt = getTaskLastUpdatedAt(task);
  const repositoryPrUrl = task.pr?.url ?? task.workspace_pr?.url;

  return (
    <article
      data-feature-task-card
      className="border border-border bg-surface px-3 py-3"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs font-semibold uppercase text-text-secondary">
            {task.id}
          </span>
          <TaskStatusBadge status={task.status} />
        </div>
        {updatedAt ? (
          <span className="shrink-0 text-xs text-text-muted">
            {formatTimestamp(updatedAt)}
          </span>
        ) : null}
      </div>

      <h4 className="mt-2 truncate text-sm font-semibold text-text-primary">
        {task.title || task.id}
      </h4>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-text-secondary">
        <span className="flex min-w-0 items-center gap-2">
          <GitBranch className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{task.branch || "No branch"}</span>
        </span>
        {repositoryPrUrl ? (
          <a
            href={repositoryPrUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex min-w-0 items-center gap-2 text-text-secondary transition-colors hover:text-primary"
            aria-label={`Open repository PR for ${task.id}`}
          >
            <GitPullRequest
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span className="truncate font-mono">Repository PR</span>
            <ExternalLink
              className="h-3.5 w-3.5 shrink-0 text-text-muted"
              aria-hidden="true"
            />
          </a>
        ) : (
          <div className="flex min-w-0 items-center gap-2 text-text-muted">
            <GitPullRequest
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span className="truncate font-mono">Repository PR</span>
            <span className="italic text-xs">None</span>
          </div>
        )}
      </div>

      {task.description ? (
        <div className="mt-3 flex items-start gap-2 border border-border bg-surface-secondary px-3 py-2 text-sm text-text-primary">
          <ArrowRight
            className="mt-0.5 h-4 w-4 shrink-0 text-success"
            aria-hidden="true"
          />
          <span>{task.description}</span>
        </div>
      ) : null}
    </article>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const statusStyle = getStatusStyle(status);

  return (
    <span
      className={
        "border border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide " +
        statusStyle.bg +
        " " +
        statusStyle.text
      }
    >
      {formatStatusLabel(status)}
    </span>
  );
}

function getTaskLastUpdatedAt(task: ParsedTask): string | null {
  let latest = task.execution?.last_updated_at ?? null;
  let latestTime = latest ? new Date(latest).getTime() : Number.NaN;

  for (const entry of task.log ?? []) {
    const entryTime = new Date(entry.at).getTime();
    if (Number.isNaN(entryTime)) continue;
    if (!latest || Number.isNaN(latestTime) || entryTime > latestTime) {
      latest = entry.at;
      latestTime = entryTime;
    }
  }

  return latest;
}

type FeatureTimelineEntry = LogEntry & {
  taskId: string;
  taskTitle: string;
  sortTime: number;
  sequence: number;
};

function ActivityTimelineSection({ feature }: { feature: ParsedFeature }) {
  const timelineEntries = getFeatureTimelineEntries(feature);

  return (
    <section className="mt-8">
      <h3 className="text-base font-semibold text-text-primary">
        Activity Timeline
      </h3>
      <div className="mt-2 border-t border-border pt-4">
        {timelineEntries.length > 0 ? (
          <ol className="flex flex-col gap-3">
            {timelineEntries.map((entry, index) => (
              <FeatureTimelineItem
                key={`${entry.taskId}-${entry.at}-${entry.action}-${index}`}
                entry={entry}
                isLast={index === timelineEntries.length - 1}
              />
            ))}
          </ol>
        ) : (
          <p className="text-sm italic text-text-muted">
            No activity logs available.
          </p>
        )}
      </div>
    </section>
  );
}

function getFeatureTimelineEntries(feature: ParsedFeature): FeatureTimelineEntry[] {
  if (feature.activity !== undefined) {
    return feature.activity
      .map((entry, sequence) => {
        const entryTime = new Date(entry.at).getTime();
        return {
          ...entry,
          taskId: entry.targetId,
          taskTitle: entry.targetTitle,
          sortTime: Number.isNaN(entryTime)
            ? Number.NEGATIVE_INFINITY
            : entryTime,
          sequence,
        };
      })
      .sort(sortTimelineEntries);
  }

  let sequence = 0;
  const entries: FeatureTimelineEntry[] = [];

  for (const task of feature.tasks) {
    for (const entry of task.log ?? []) {
      const entryTime = new Date(entry.at).getTime();
      entries.push({
        ...entry,
        taskId: task.id,
        taskTitle: task.title,
        sortTime: Number.isNaN(entryTime)
          ? Number.NEGATIVE_INFINITY
          : entryTime,
        sequence,
      });
      sequence += 1;
    }
  }

  return entries.sort(sortTimelineEntries);
}

function sortTimelineEntries(a: FeatureTimelineEntry, b: FeatureTimelineEntry): number {
  if (a.sortTime !== b.sortTime) return b.sortTime - a.sortTime;
  return a.sequence - b.sequence;
}

function getTimelineStatusKey(action: string): string {
  if (action === "started" || action === "claimed") return "in_progress";
  if (action === "moved_to_review") return "in_review";
  return action;
}

function FeatureTimelineItem({
  entry,
  isLast,
}: {
  entry: FeatureTimelineEntry;
  isLast: boolean;
}) {
  const statusStyle = getStatusStyle(getTimelineStatusKey(entry.action));

  return (
    <li
      data-feature-timeline-entry
      data-feature-timeline-task={entry.taskId}
      className="flex gap-3"
    >
      <div className="flex flex-col items-center pt-1">
        <span
          className={"h-2 w-2 rounded-full " + statusStyle.dot}
          aria-hidden="true"
        />
        {isLast ? null : (
          <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pb-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <TimelineStatusBadge
              action={entry.action}
              statusStyle={statusStyle}
            />
            <span className="shrink-0 font-mono text-xs font-semibold text-text-muted">
              {entry.taskId}
            </span>
          </div>
          <span className="shrink-0 text-xs text-text-muted">
            {formatTimestamp(entry.at)}
          </span>
        </div>
        <p className="truncate text-sm font-medium text-text-primary">
          {entry.taskTitle || entry.taskId}
        </p>
        <span className="text-xs text-text-muted">by {entry.by}</span>
        {entry.note ? (
          <p className="mt-1 text-sm text-text-secondary">{entry.note}</p>
        ) : null}
      </div>
    </li>
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
