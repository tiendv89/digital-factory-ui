"use client";

import { type ReactNode } from "react";
import { Check, Clock3, Code2, FileText, List } from "lucide-react";
import { FeatureDocumentPanel } from "@/features/board/components/FeatureTabView/FeatureDocumentPanel";
import { FeatureTasksPanel } from "@/features/board/components/FeatureTabView/FeatureTasksPanel";
import { FeatureLogsPanel } from "@/features/board/components/FeatureTabView/FeatureLogsPanel";
import type { ActivityEvent, FeatureDetail } from "@/services/workflow-backend/types";

export type DocTab = "product_spec" | "technical_design" | "tasks" | "logs";

type FeatureIDEDocsPanelProps = {
  feature: FeatureDetail;
  workspaceId: string;
  featureId: string;
  activeTab: DocTab;
  onTabChange: (tab: DocTab) => void;
  activityEvents: ActivityEvent[];
  activityLoading: boolean;
  onOpenTaskTab: (taskId: string, taskName: string, title: string) => void;
};

function DocTabButton({
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
        "inline-flex h-8 min-w-0 items-center gap-1.5 px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
        (active
          ? "border-b-2 border-primary text-text-primary"
          : "text-text-secondary hover:text-text-primary")
      }
    >
      {icon}
      <span className="truncate">{label}</span>
      {trailing}
    </button>
  );
}

export function FeatureIDEDocsPanel({
  feature,
  activeTab,
  onTabChange,
  activityEvents,
  activityLoading,
  onOpenTaskTab,
}: FeatureIDEDocsPanelProps) {
  const hasProductSpec = feature.stages?.product_spec?.review_status === "approved";
  const hasTechnicalDesign = feature.stages?.technical_design?.review_status === "approved";

  return (
    <div
      data-feature-ide-docs-panel
      className="flex h-full flex-col overflow-hidden bg-bg"
    >
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Feature documents"
        className="flex shrink-0 items-center gap-0 border-b border-border bg-surface px-2"
      >
        <DocTabButton
          label="Product Spec"
          icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
          trailing={
            hasProductSpec ? (
              <Check className="h-3 w-3 text-success" aria-hidden="true" />
            ) : undefined
          }
          active={activeTab === "product_spec"}
          onClick={() => onTabChange("product_spec")}
          dataAttr="data-docs-tab-product-spec"
        />
        <DocTabButton
          label="Tech Design"
          icon={<Code2 className="h-3.5 w-3.5" aria-hidden="true" />}
          trailing={
            hasTechnicalDesign ? (
              <Check className="h-3 w-3 text-success" aria-hidden="true" />
            ) : undefined
          }
          active={activeTab === "technical_design"}
          onClick={() => onTabChange("technical_design")}
          dataAttr="data-docs-tab-tech-design"
        />
        <DocTabButton
          label="Tasks"
          icon={<List className="h-3.5 w-3.5" aria-hidden="true" />}
          active={activeTab === "tasks"}
          onClick={() => onTabChange("tasks")}
          dataAttr="data-docs-tab-tasks"
        />
        <DocTabButton
          label="Logs"
          icon={<Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}
          active={activeTab === "logs"}
          onClick={() => onTabChange("logs")}
          dataAttr="data-docs-tab-logs"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "product_spec" && (
          <FeatureDocumentPanel feature={feature} documentType="product_spec" />
        )}
        {activeTab === "technical_design" && (
          <FeatureDocumentPanel feature={feature} documentType="technical_design" />
        )}
        {activeTab === "tasks" && (
          <FeatureTasksPanel feature={feature} onOpenTaskTab={onOpenTaskTab} />
        )}
        {activeTab === "logs" && (
          <FeatureLogsPanel events={activityEvents} loading={activityLoading} />
        )}
      </div>
    </div>
  );
}
