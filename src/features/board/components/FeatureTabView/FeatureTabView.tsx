"use client";

import { useState, type ReactNode } from "react";
import {
  AlertCircle,
  Check,
  Code2,
  Clock3,
  FileText,
  List,
  RefreshCw,
} from "lucide-react";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { useFeatureDetail } from "../../hooks/useFeatureDetail";
import { FeatureTabHeader } from "./FeatureTabHeader";
import { FeatureDocumentPanel } from "./FeatureDocumentPanel";
import { FeatureTasksPanel } from "./FeatureTasksPanel";
import { FeatureLogsPanel } from "./FeatureLogsPanel";
import type { FeatureDetail } from "@/services/workflow-backend/types";

export type FeatureTabViewProps = {
  workspaceId: string;
  featureId: string;
};

type FeatureTabPanel = "product_spec" | "technical_design" | "tasks" | "logs";

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
  const {
    activeFeatureTabId,
    closeFeatureTab,
    goToBoard,
    openTaskTab,
  } = useWorkspaceContext();
  const [copied, setCopied] = useState(false);
  const [activePanel, setActivePanel] = useState<FeatureTabPanel>("logs");

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

  function handleOpenTaskTab(taskId: string, taskName: string, title: string) {
    openTaskTab({
      taskId,
      taskName,
      title,
      featureId: feature.id,
      featureName: feature.feature_name,
      parentFeatureTabSessionId: activeFeatureTabId ?? undefined,
    });
  }

  const hasProductSpec =
    feature.stages?.product_spec?.review_status === "approved";
  const hasTechnicalDesign =
    feature.stages?.technical_design?.review_status === "approved";

  return (
    <div
      data-feature-tab-content
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-bg"
    >
      <FeatureTabHeader
        feature={feature}
        onBack={handleBackToBoard}
        onCopyId={handleCopyId}
        copied={copied}
      />

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
            onOpenTaskTab={handleOpenTaskTab}
          />
        )}
        {activePanel === "logs" && <FeatureLogsPanel feature={feature} />}
      </div>
    </div>
  );
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
