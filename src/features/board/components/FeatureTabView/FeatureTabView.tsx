"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ClipboardCopy,
  Clock3,
  ExternalLink,
  GitPullRequest,
  Layers,
  RefreshCw,
} from "lucide-react";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { useFeatureDetail, useFeatureTask } from "../../hooks/useFeatureDetail";
import { formatTimestamp } from "@/lib/time";
import { MarkdownContent } from "@/lib/markdown";
import {
  getFeatureStatusColor,
  getFeatureStatusLabel,
} from "../../lib/status";
import {
  formatStatusLabel,
  getStatusStyle,
} from "@/features/tasks/lib/status";
import type { FeatureDetail, TaskSummary, TaskDetail } from "@/services/workflow-backend/types";

export type FeatureTabViewProps = {
  workspaceId: string;
  featureId: string;
};

type FeatureTabPanel = "tasks" | "product_spec" | "technical_design";

export function FeatureTabView({ workspaceId, featureId }: FeatureTabViewProps) {
  const { feature, loading, error, reload } = useFeatureDetail(workspaceId, featureId);

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

  return <FeatureTabContent feature={feature} onReload={reload} />;
}

function FeatureTabContent({
  feature,
  onReload,
}: {
  feature: FeatureDetail;
  onReload: () => void;
}) {
  const { goToBoard } = useWorkspaceContext();
  const [copied, setCopied] = useState(false);
  const [activePanel, setActivePanel] = useState<FeatureTabPanel>("tasks");
  const [drilldownTaskId, setDrilldownTaskId] = useState<string | null>(null);

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
      className="flex h-full flex-col overflow-hidden"
    >
      {/* Feature tab header */}
      <header
        data-feature-tab-header
        className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-6 py-4"
      >
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
          {/* Copy feature id button */}
          <button
            type="button"
            data-copy-feature-id
            onClick={handleCopyId}
            aria-label={`Copy feature id ${feature.feature_name}`}
            title="Copy feature ID"
            className="flex items-center gap-1 bg-chip-bg px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-text-secondary transition-colors hover:bg-primary-light hover:text-primary"
          >
            {feature.feature_name || feature.feature_id}
            {copied ? (
              <Check className="h-3 w-3 text-success" aria-hidden="true" />
            ) : (
              <ClipboardCopy className="h-3 w-3" aria-hidden="true" />
            )}
          </button>

          {/* Status badge */}
          <span
            data-feature-status={feature.status}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
            style={{ backgroundColor: statusColor + "22", color: statusColor }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: statusColor }}
              aria-hidden="true"
            />
            {statusLabel}
          </span>

          {/* Stage badge */}
          {feature.current_stage && (
            <span
              data-feature-stage
              className="flex items-center gap-1 bg-surface-secondary px-2 py-0.5 text-xs font-medium text-text-secondary"
            >
              <Layers className="h-3 w-3 shrink-0" aria-hidden="true" />
              {feature.current_stage}
            </span>
          )}

          <h1 className="min-w-0 truncate text-base font-semibold text-text-primary">
            {feature.title || feature.feature_name}
          </h1>
        </div>

        {/* Updated time */}
        {feature.updated_at && (
          <span
            data-feature-updated-at={feature.updated_at}
            className="shrink-0 flex items-center gap-1 text-xs text-text-muted"
          >
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {formatTimestamp(feature.updated_at)}
          </span>
        )}

        {/* Task counts */}
        {feature.task_counts && (
          <FeatureTaskCountsBadge counts={feature.task_counts} />
        )}

        <button
          type="button"
          onClick={onReload}
          aria-label="Reload feature"
          className="shrink-0 p-1 text-text-secondary transition-colors hover:text-text-primary"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </button>
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

      {/* Panel navigation */}
      <div className="flex shrink-0 gap-0 border-b border-border bg-surface">
        <PanelTab
          label="Tasks"
          active={activePanel === "tasks"}
          onClick={() => setActivePanel("tasks")}
          dataAttr="data-panel-tasks"
        />
        <PanelTab
          label="Product Spec"
          active={activePanel === "product_spec"}
          onClick={() => setActivePanel("product_spec")}
          dataAttr="data-panel-product-spec"
        />
        <PanelTab
          label="Technical Design"
          active={activePanel === "technical_design"}
          onClick={() => setActivePanel("technical_design")}
          dataAttr="data-panel-technical-design"
        />
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {activePanel === "tasks" && (
          <FeatureTasksPanel
            feature={feature}
            onDrilldown={setDrilldownTaskId}
          />
        )}
        {activePanel === "product_spec" && (
          <FeatureDocumentPanel
            feature={feature}
            documentType="product_spec"
          />
        )}
        {activePanel === "technical_design" && (
          <FeatureDocumentPanel
            feature={feature}
            documentType="technical_design"
          />
        )}
      </div>
    </div>
  );
}

function PanelTab({
  label,
  active,
  onClick,
  dataAttr,
}: {
  label: string;
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
        "px-5 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
        (active
          ? "border-b-2 border-b-success text-text-primary"
          : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary")
      }
    >
      {label}
    </button>
  );
}

function FeatureTaskCountsBadge({
  counts,
}: {
  counts: FeatureDetail["task_counts"];
}) {
  return (
    <span
      data-feature-task-counts
      className="flex shrink-0 items-center gap-1.5 text-xs text-text-muted"
      title={`Total: ${counts.total}, Done: ${counts.done}, In progress: ${counts.in_progress}, Blocked: ${counts.blocked}`}
    >
      <span className="text-text-secondary font-medium">{counts.done}</span>
      <span>/</span>
      <span>{counts.total}</span>
      <span className="hidden sm:inline">tasks done</span>
    </span>
  );
}

function FeatureTasksPanel({
  feature,
  onDrilldown,
}: {
  feature: FeatureDetail;
  onDrilldown: (taskId: string) => void;
}) {
  const tasks = feature.tasks ?? [];

  if (tasks.length === 0) {
    return (
      <div
        data-feature-tasks-empty
        className="flex flex-1 flex-col items-center justify-center gap-2 py-20"
      >
        <p className="text-sm text-text-muted">No tasks in this feature.</p>
      </div>
    );
  }

  return (
    <div
      data-feature-tasks-list
      className="mx-auto max-w-3xl px-6 py-6 space-y-2"
    >
      {tasks.map((task) => (
        <FeatureTaskRow
          key={task.id}
          task={task}
          onDrilldown={() => onDrilldown(task.id)}
        />
      ))}
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
    <div
      data-feature-doc={documentType}
      className="mx-auto max-w-3xl px-6 py-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">{docTitle}</h2>
        <div className="flex items-center gap-3">
          {doc.source_path && (
            <span
              data-feature-doc-source-path
              className="font-mono text-xs text-text-muted"
            >
              {doc.source_path}
            </span>
          )}
          {doc.url && (
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1.5 text-xs text-primary transition-colors hover:underline"
              aria-label={`View source for ${docTitle}`}
            >
              View source
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {doc.content ? (
        <div className="border border-border bg-surface px-6 py-5">
          <MarkdownContent content={doc.content} />
        </div>
      ) : (
        <div
          data-feature-doc-no-content
          className="flex flex-col items-center justify-center gap-2 border border-border bg-surface px-4 py-8"
        >
          <p className="text-sm text-text-muted">
            Document content not available from backend.
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
  const { task, loading, error, reload } = useFeatureTask(workspaceId, featureId, taskId);

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
  const statusStyle = getStatusStyle(task.status);

  return (
    <div
      data-feature-task-drilldown-content
      className="flex h-full flex-col overflow-hidden"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-6 py-4">
        <button
          type="button"
          data-back-to-feature
          onClick={onBack}
          aria-label="Back to feature"
          className="flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Feature
        </button>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
          <h2 className="min-w-0 truncate text-base font-semibold text-text-primary">
            {task.title || task.task_name}
          </h2>
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

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <DrilldownMetadataSection task={task} />
          {task.depends_on && task.depends_on.length > 0 && (
            <DrilldownDependenciesSection task={task} />
          )}
          {task.pr_refs && task.pr_refs.length > 0 && (
            <DrilldownPrRefsSection task={task} />
          )}
        </div>
      </div>
    </div>
  );
}

function DrilldownMetadataSection({ task }: { task: TaskDetail }) {
  return (
    <section>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Repository
          </span>
          {task.repo ? (
            <a
              href={`https://github.com/${task.repo}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:underline"
            >
              {task.repo}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : (
            <span className="text-sm italic text-text-muted">None</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Branch
          </span>
          {task.branch ? (
            <span className="font-mono text-xs text-success">{task.branch}</span>
          ) : (
            <span className="text-sm italic text-text-muted">None</span>
          )}
        </div>
        {task.blocked_reason && (
          <div className="col-span-2 flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              Blocked Reason
            </span>
            <div
              data-drilldown-blocked-reason
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
  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Dependencies
      </h2>
      <div className="flex flex-wrap gap-2">
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

function DrilldownPrRefsSection({ task }: { task: TaskDetail }) {
  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Pull Requests
      </h2>
      <div className="flex flex-col gap-2">
        {task.pr_refs.map((ref) => (
          <a
            key={ref.url}
            href={ref.url}
            target="_blank"
            rel="noreferrer noopener"
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
                <span className="rounded bg-chip-bg px-1.5 text-[10px] font-medium uppercase text-text-secondary">
                  {ref.status}
                </span>
              )}
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}
