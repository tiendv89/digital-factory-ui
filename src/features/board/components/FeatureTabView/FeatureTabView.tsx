"use client";

import { useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Check,
  ClipboardCopy,
  Code2,
  Clock3,
  ExternalLink,
  FileText,
  GitBranch,
  GitPullRequest,
  Layers,
  List,
  RefreshCw,
  User,
} from "lucide-react";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { useFeatureDetail, useFeatureTask } from "../../hooks/useFeatureDetail";
import { useDocumentContent } from "../../hooks/useDocumentContent";
import { formatTimestamp } from "@/lib/time";
import { MarkdownContent } from "@/lib/markdown";
import { getFeatureStatusColor, getFeatureStatusLabel } from "../../lib/status";
import { formatStatusLabel, getStatusStyle } from "@/features/tasks/lib/status";
import { getStatusColor } from "@/features/board/lib/status";
import type {
  ActivityEvent,
  FeatureDetail,
  PullRequestRef,
  TaskSummary,
  TaskDetail,
} from "@/services/workflow-backend/types";

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

export type FeatureTabViewProps = {
  workspaceId: string;
  featureId: string;
};

type FeatureTabPanel = "product_spec" | "technical_design" | "tasks" | "logs";
type PullRequestRefWithUrl = PullRequestRef & { url: string };

export function FeatureTabView({
  workspaceId,
  featureId,
}: FeatureTabViewProps) {
  const { feature, loading, error, reload } = useFeatureDetail(
    workspaceId,
    featureId,
  );

  if (loading) {
    return (
      <div
        data-feature-tab-loading
        className="flex flex-1 items-center justify-center"
      >
        <p className="text-sm text-text-muted">Loading feature…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-feature-tab-error
        className="flex flex-1 flex-col items-center justify-center gap-4"
      >
        <AlertCircle className="h-8 w-8 text-danger" aria-hidden="true" />
        <p className="text-sm text-text-secondary">
          {error.message || "Failed to load feature."}
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

  if (!feature) return null;

  return <FeatureTabContent feature={feature} />;
}

function FeatureTabContent({ feature }: { feature: FeatureDetail }) {
  const { activeFeatureTabId, closeFeatureTab, goToBoard } =
    useWorkspaceContext();
  const [copied, setCopied] = useState(false);
  const [activePanel, setActivePanel] = useState<FeatureTabPanel>("logs");
  const [drilldownTaskId, setDrilldownTaskId] = useState<string | null>(null);

  function handleBackToBoard() {
    if (activeFeatureTabId) {
      closeFeatureTab(activeFeatureTabId);
      return;
    }
    goToBoard();
  }

  function handleCopyId() {
    const textToCopy = feature.feature_name || feature.feature_id || feature.id;
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

  const statusColor = getFeatureStatusColor(feature.status);
  const statusLabel = getFeatureStatusLabel(feature.status);
  const featureSummary = getFeatureLogsSummary(feature);

  const hasProductSpec =
    feature.stages?.product_spec?.review_status === "approved";
  const hasTechnicalDesign =
    feature.stages?.technical_design?.review_status === "approved";
  const stageOrder = [
    "product_spec",
    "technical_design",
    "tasks",
    "handoff",
  ] as const;
  const stageLabels: Record<(typeof stageOrder)[number], string> = {
    product_spec: "Product spec",
    technical_design: "Technical design",
    tasks: "Tasks",
    handoff: "Handoff",
  };
  const currentStageIndex = stageOrder.indexOf(
    feature.current_stage as (typeof stageOrder)[number],
  );

  function getStageTone(stage: (typeof stageOrder)[number], index: number) {
    if (feature.current_stage === stage) return "current";
    if (feature.stages?.[stage]?.review_status === "approved") return "done";
    if (currentStageIndex > index) return "done";
    return "todo";
  }

  if (drilldownTaskId) {
    return (
      <FeatureTaskDrilldown
        workspaceId={feature.workspace_id}
        featureId={feature.id}
        taskId={drilldownTaskId}
        onBack={() => setDrilldownTaskId(null)}
      />
    );
  }

  return (
    <div
      data-feature-tab-content
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-bg"
    >
      <header
        data-feature-tab-header
        className="shrink-0 border-b border-border bg-surface px-5 py-4"
      >
        <div className="mb-4 flex items-center">
          <button
            type="button"
            data-back-to-board
            onClick={handleBackToBoard}
            aria-label="Back to board"
            className="inline-flex h-8 items-center gap-1.5 border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <h1 className="min-w-0 truncate text-xl font-semibold leading-7 text-text-primary">
            {feature.title || feature.feature_name}
          </h1>
          <button
            type="button"
            data-copy-feature-id
            onClick={handleCopyId}
            aria-label={`Copy feature id ${feature.feature_name}`}
            title="Copy feature ID"
            className="flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            ) : (
              <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            data-feature-status={feature.status}
            className="inline-flex items-center gap-1.5 px-2 py-1 font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `${statusColor}18`, color: statusColor }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: statusColor }}
              aria-hidden="true"
            />
            {statusLabel.toUpperCase()}
          </span>

          {feature.current_stage && (
            <span className="relative inline-flex group/stages">
              <span
                data-feature-stage
                className="inline-flex items-center gap-2 border border-success/30 bg-success-bg px-2 py-1 font-semibold uppercase tracking-wide text-success"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-success"
                  aria-hidden="true"
                />
                <span>{formatBadgeLabel(feature.current_stage)}</span>
              </span>
              <span
                className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-48 border border-border bg-surface p-2 text-[13px] text-text-secondary opacity-0 shadow-lg transition-opacity group-hover/stages:opacity-100"
                aria-hidden="true"
              >
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  Stages
                </span>
                <span className="flex flex-col gap-1">
                  {stageOrder.map((stage, index) => {
                    const tone = getStageTone(stage, index);
                    const dotClass =
                      tone === "done" || tone === "current"
                        ? "bg-success"
                        : "bg-text-muted";
                    const textClass =
                      tone === "done" || tone === "current"
                        ? "text-success"
                        : "text-text-muted";
                    return (
                      <span
                        key={stage}
                        className={"flex items-center gap-2 " + textClass}
                      >
                        <span
                          className={"h-1.5 w-1.5 rounded-full " + dotClass}
                        />
                        <span>{stageLabels[stage]}</span>
                      </span>
                    );
                  })}
                </span>
              </span>
            </span>
          )}

          {feature.updated_at && (
            <span
              data-feature-updated-at={feature.updated_at}
              className="inline-flex items-center gap-1 text-text-muted"
            >
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              Modified {formatTimestamp(feature.updated_at)}
            </span>
          )}
        </div>

        <p className="mt-3 max-w-208 text-sm leading-6 text-text-secondary">
          {featureSummary}
        </p>
      </header>

      {/* Source state stale warning */}
      {feature.source_state?.stale && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-warning-bg px-6 py-2 text-xs text-warning">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Data may be stale
            {feature.source_state.error_code
              ? ` (${feature.source_state.error_code})`
              : ""}
          </span>
        </div>
      )}

      <div className="shrink-0 border-b border-border bg-surface-secondary px-5 py-3">
        <div className="inline-flex w-fit max-w-full items-center border border-border bg-surface p-1">
          <PanelTab
            label="Product Spec"
            icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
            trailing={
              hasProductSpec ? (
                <Check className="h-3 w-3" aria-hidden="true" />
              ) : undefined
            }
            active={activePanel === "product_spec"}
            onClick={() => setActivePanel("product_spec")}
            dataAttr="data-panel-product-spec"
          />
          <PanelTab
            label="Technical Design"
            icon={<Code2 className="h-3.5 w-3.5" aria-hidden="true" />}
            trailing={
              hasTechnicalDesign ? (
                <Check className="h-3 w-3" aria-hidden="true" />
              ) : undefined
            }
            active={activePanel === "technical_design"}
            onClick={() => setActivePanel("technical_design")}
            dataAttr="data-panel-technical-design"
          />
          <PanelTab
            label="Tasks"
            icon={<List className="h-3.5 w-3.5" aria-hidden="true" />}
            active={activePanel === "tasks"}
            onClick={() => setActivePanel("tasks")}
            dataAttr="data-panel-tasks"
          />
          <PanelTab
            label="Logs"
            icon={<Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}
            active={activePanel === "logs"}
            onClick={() => setActivePanel("logs")}
            dataAttr="data-panel-logs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-bg">
        {activePanel === "product_spec" && (
          <FeatureDocumentPanel feature={feature} documentType="product_spec" />
        )}
        {activePanel === "technical_design" && (
          <FeatureDocumentPanel
            feature={feature}
            documentType="technical_design"
          />
        )}
        {activePanel === "tasks" && (
          <FeatureTasksPanel
            feature={feature}
            onDrilldown={setDrilldownTaskId}
          />
        )}
        {activePanel === "logs" && <FeatureLogsPanel feature={feature} />}
      </div>
    </div>
  );
}

function formatBadgeLabel(value: string): string {
  return value.replace(/_/g, " ").toUpperCase();
}

function getFeatureLogsSummary(feature: FeatureDetail): string {
  const status = feature.status || "unknown";
  const stage = feature.current_stage || "unknown";
  const taskCount = feature.task_counts?.total ?? feature.tasks?.length ?? 0;
  const documents = new Set(
    (feature.documents ?? []).map((doc) => doc.document_type),
  );
  const approvedParts = [
    documents.has("product_spec") ? "product spec" : null,
    documents.has("technical_design") ? "technical design" : null,
    taskCount > 0 ? "tasks" : null,
  ].filter(Boolean);

  const approvedText =
    approvedParts.length > 0
      ? ` with ${approvedParts.join(", ")} already approved.`
      : ".";

  return `Logs view. The current workflow state is ${status} at the ${stage} stage${approvedText}`;
}

function PanelTab({
  label,
  icon,
  trailing,
  active,
  onClick,
  dataAttr,
}: {
  label: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  active: boolean;
  onClick: () => void;
  dataAttr: string;
}) {
  const attrs: Record<string, string> = { [dataAttr]: "" };
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      {...attrs}
      className={
        "inline-flex h-8 min-w-0 items-center gap-2 px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
        (active
          ? "rounded bg-success text-white"
          : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary")
      }
    >
      {icon}
      <span className="truncate">{label}</span>
      {trailing}
    </button>
  );
}

type TaskSubView = "list" | "markdown";

function FeatureTasksPanel({
  feature,
  onDrilldown,
}: {
  feature: FeatureDetail;
  onDrilldown: (taskId: string) => void;
}) {
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
      {/* Header with count + sub-toggle */}
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
            tasks.md
          </button>
        </div>
      </div>

      {/* Content */}
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
              <p className="text-sm text-text-muted">Loading tasks.md…</p>
            </div>
          ) : tasksMarkdown ? (
            <div className="border border-border bg-surface px-6 py-5">
              <MarkdownContent content={tasksMarkdown} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 border border-border bg-surface px-4 py-8">
              <p className="text-sm text-text-muted">
                No tasks.md document available.
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

type FeatureLogEntry = ActivityEvent & {
  sortTime: number;
  sequence: number;
};

function FeatureLogsPanel({ feature }: { feature: FeatureDetail }) {
  const logs = getSortedFeatureLogs(feature.activity);

  return (
    <div data-feature-logs-panel className="px-6 py-6">
      <section className="w-1/2 bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-text-primary">
            <Clock3 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            Feature Logs
          </h2>
          <span className="border border-border bg-surface-secondary px-2 py-1 font-mono text-xs text-text-muted">
            status.yaml
          </span>
        </div>
        {logs.length > 0 ? (
          <ol className="px-5 py-4">
            {logs.map((entry, index) => (
              <FeatureLogItem
                key={`${entry.scope}-${entry.action}-${entry.occurred_at}-${index}`}
                entry={entry}
                isLast={index === logs.length - 1}
              />
            ))}
          </ol>
        ) : (
          <p className="px-5 py-8 text-sm italic text-text-muted">
            No activity logs available.
          </p>
        )}
      </section>
    </div>
  );
}

function getSortedFeatureLogs(
  activity: FeatureDetail["activity"],
): FeatureLogEntry[] {
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

function FeatureLogItem({
  entry,
  isLast,
}: {
  entry: FeatureLogEntry;
  isLast: boolean;
}) {
  const scopeLabel = entry.scope ? entry.scope.replace(/_/g, " ") : "feature";

  return (
    <li data-feature-log-entry className="flex gap-4">
      <div className="flex flex-col items-center pt-2">
        <span
          className="h-1.5 w-1.5 rounded-full bg-success"
          aria-hidden="true"
        />
        {isLast ? null : (
          <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
        )}
      </div>
      <div className="mb-4 min-w-0 flex-1 border border-border bg-surface-secondary px-4 py-3">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold capitalize text-text-primary">
              {formatStatusLabel(entry.action)}
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              {scopeLabel} by {entry.actor}
            </p>
          </div>
          <span className="shrink-0 text-xs text-text-muted">
            {formatTimestamp(entry.occurred_at)}
          </span>
        </div>
        {entry.note ? (
          <p className="mt-3 border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            {entry.note}
          </p>
        ) : null}
      </div>
    </li>
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

function FeatureDocumentPanel({
  feature,
  documentType,
}: {
  feature: FeatureDetail;
  documentType: string;
}) {
  const doc = (feature.documents ?? []).find(
    (d) => d.document_type === documentType,
  );

  const { content, loading, error } = useDocumentContent(
    doc?.url,
    doc?.content,
  );

  if (!doc) {
    return (
      <div
        data-feature-doc-empty={documentType}
        className="flex flex-1 flex-col items-center justify-center gap-2 py-20"
      >
        <p className="text-sm text-text-muted">
          {documentType === "product_spec"
            ? "No product spec available."
            : "No technical design available."}
        </p>
      </div>
    );
  }

  const docTitle =
    documentType === "product_spec" ? "Product Spec" : "Technical Design";

  return (
    <div data-feature-doc={documentType} className="w-1/2 px-6 py-6">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">
            {docTitle}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8">
            <RefreshCw
              className="h-4 w-4 animate-spin text-text-muted"
              aria-hidden="true"
            />
            <p className="text-sm text-text-muted">Loading document content…</p>
          </div>
        ) : content ? (
          <div className="border border-border bg-surface px-6 py-5">
            <MarkdownContent content={content} />
          </div>
        ) : error ? (
          <div
            data-feature-doc-error
            className="flex flex-col gap-2 border border-danger/30 bg-danger-bg px-4 py-4"
          >
            <div className="flex items-center gap-2">
              <AlertCircle
                className="h-4 w-4 shrink-0 text-danger"
                aria-hidden="true"
              />
              <p className="text-sm text-danger">
                Failed to load document content.
              </p>
            </div>
            {doc.url && (
              <a
                href={doc.url}
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
            data-feature-doc-no-content
            className="flex flex-col items-center justify-center gap-2 border border-border bg-surface px-4 py-8"
          >
            <p className="text-sm text-text-muted">
              No document content available.
            </p>
            {doc.url && (
              <a
                href={doc.url}
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

      <div></div>
    </div>
  );
}

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
  const repoUrl = task.repo ? `https://github.com/${task.repo}` : null;

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
              {ref.status && (
                <span
                  className="rounded px-1.5 text-[10px] font-semibold uppercase"
                  style={{
                    backgroundColor: getPrStatusStyle(ref.status).bg,
                    color: getPrStatusStyle(ref.status).color,
                  }}
                >
                  {ref.status}
                </span>
              )}
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
