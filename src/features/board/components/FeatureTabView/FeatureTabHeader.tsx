"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  ClipboardCopy,
  Clock3,
} from "lucide-react";
import { formatTimestamp } from "@/lib/time";
import { getFeatureStatusColor, getFeatureStatusLabel } from "../../lib/status";
import type { FeatureDetail } from "@/services/workflow-backend/types";

export type FeatureTabHeaderProps = {
  feature: FeatureDetail;
  onBack: () => void;
  onCopyId: () => void;
  copied: boolean;
};

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

export function FeatureTabHeader({
  feature,
  onBack,
  onCopyId,
  copied,
}: FeatureTabHeaderProps) {
  const statusColor = getFeatureStatusColor(feature.status);
  const statusLabel = getFeatureStatusLabel(feature.status);
  const featureSummary = getFeatureLogsSummary(feature);

  const currentStageIndex = stageOrder.indexOf(
    feature.current_stage as (typeof stageOrder)[number],
  );

  function getStageTone(stage: (typeof stageOrder)[number], index: number) {
    if (feature.current_stage === stage) return "current";
    if (feature.stages?.[stage]?.review_status === "approved") return "done";
    if (currentStageIndex > index) return "done";
    return "todo";
  }

  return (
    <>
      <header
        data-feature-tab-header
        className="shrink-0 border-b border-border bg-surface px-5 py-4"
      >
        <div className="mb-4 flex items-center">
          <button
            type="button"
            data-back-to-board
            onClick={onBack}
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
            onClick={onCopyId}
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
    </>
  );
}
