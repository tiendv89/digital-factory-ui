"use client";

import { Clock3, ExternalLink, GitBranch, ListChecks } from "lucide-react";
import { useMemo } from "react";
import { getElapsedSinceStatus } from "@/lib/time";
import { clientStatusLabel } from "@/features/board/lib/status";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import { groupTrackedTasks } from "./groupTasks";
import type {
  PanelSelection,
  TrackedStatus,
  TrackedTaskItem,
} from "./TaskTrackingPanel.types";

type TaskTrackingDetailPanelProps = {
  selectedPanel: PanelSelection;
};

const DETAIL_COPY = {
  blocked: {
    title: clientStatusLabel("blocked"),
    metric: "Blocked time",
    empty: "No blocked tasks",
    secondary: "Blocked reason",
  },
  reviewing: {
    title: clientStatusLabel("reviewing"),
    metric: "Review time",
    empty: "No tasks in review",
    secondary: "Pull request",
  },
  in_review: {
    title: clientStatusLabel("in_review"),
    metric: "Review time",
    empty: "No tasks in review",
    secondary: "Pull request",
  },
  in_progress: {
    title: clientStatusLabel("in_progress"),
    metric: "Active time",
    empty: "No tasks in progress",
    secondary: "Branch",
  },
  ready: {
    title: clientStatusLabel("ready"),
    metric: "Wait time",
    empty: "No tasks ready to start",
    secondary: "Dependencies",
  },
} satisfies Record<
  TrackedStatus,
  { title: string; metric: string; empty: string; secondary: string }
>;

function getSecondaryValue(status: TrackedStatus, item: TrackedTaskItem): string {
  if (status === "blocked") {
    return item.task.blockedReason || "Unknown";
  }

  if (status === "ready") {
    return item.task.dependsOn.length > 0
      ? item.task.dependsOn.join(", ")
      : "None";
  }

  if (status === "in_review") {
    return (
      item.task.workspace_pr?.status || item.task.pr?.status || "Not linked"
    );
  }

  return item.task.branch || "Not set";
}

function getPullRequestUrl(item: TrackedTaskItem): string | undefined {
  return item.task.workspace_pr?.url || item.task.pr?.url;
}

export function TaskTrackingDetailPanel({
  selectedPanel,
}: TaskTrackingDetailPanelProps) {
  const { trackedFeatures } = useBoardContext();

  const selectedSection = useMemo(() => {
    if (selectedPanel === "kanban_board") return null;
    return groupTrackedTasks(trackedFeatures).find(
      (section) => section.status === selectedPanel,
    );
  }, [trackedFeatures, selectedPanel]);

  if (!selectedSection) return null;

  const detail = DETAIL_COPY[selectedSection.status];

  return (
    <section
      className="min-w-0 flex-1 overflow-hidden bg-bg p-6"
      aria-label={`${detail.title} detail`}
    >
      <div className="flex h-full min-h-0 flex-col border border-border bg-surface">
        <header className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text-primary">
              {detail.title}
            </h2>
            <span className="rounded bg-muted-bg px-2 py-0.5 font-mono text-[10px] text-text-secondary">
              {selectedSection.items.length}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          {selectedSection.items.length === 0 ? (
            <div className="flex h-28 items-center justify-center border border-dashed border-border bg-surface-secondary">
              <p className="text-xs text-text-muted">{detail.empty}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedSection.items.map((item) => {
                const prUrl = getPullRequestUrl(item);

                return (
                  <article
                    key={`${item.feature.id}/${item.task.id}`}
                    className="border border-border bg-surface-secondary p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                          {item.feature.title || item.feature.id}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold leading-snug text-text-primary">
                          <span className="font-mono text-xs text-text-secondary">
                            {item.task.id}
                          </span>{" "}
                          {item.task.title || "Untitled task"}
                        </h3>
                      </div>
                      {prUrl && (
                        <a
                          href={prUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${item.task.id} pull request`}
                          className="shrink-0 text-text-muted transition-colors hover:text-primary"
                        >
                          <ExternalLink
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </a>
                      )}
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="min-w-0 border border-border bg-surface px-2 py-1.5">
                        <dt className="flex items-center gap-1.5 text-text-muted">
                          <Clock3 className="h-3 w-3" aria-hidden="true" />
                          {detail.metric}
                        </dt>
                        <dd className="mt-1 font-mono text-text-primary">
                          {getElapsedSinceStatus(item.task)}
                        </dd>
                      </div>
                      <div className="min-w-0 border border-border bg-surface px-2 py-1.5">
                        <dt className="flex items-center gap-1.5 text-text-muted">
                          {selectedSection.status === "ready" ? (
                            <ListChecks className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <GitBranch className="h-3 w-3" aria-hidden="true" />
                          )}
                          {detail.secondary}
                        </dt>
                        <dd className="mt-1 truncate font-mono text-text-primary">
                          {getSecondaryValue(selectedSection.status, item)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
