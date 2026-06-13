"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Code2, ExternalLink, FileText, GitPullRequest } from "lucide-react";
import { type ReactNode } from "react";

import { FeatureDocumentPanel } from "@/components/board/feature-document-panel";
import { workspaceKeys } from "@/constants/query-keys";
import { getDocumentPrStatus } from "@/services/workflow-backend/documents";
import type { FeatureDetail } from "@/services/workflow-backend/types";

export type DocTab = "product_spec" | "technical_design";

type FeatureIDEDocsPanelProps = {
  feature: FeatureDetail;
  activeTab: DocTab;
  onTabChange: (tab: DocTab) => void;
};

function DocTabButton({ label, icon, trailing, active, onClick, dataAttr }: { label: string; icon?: ReactNode; trailing?: ReactNode; active: boolean; onClick: () => void; dataAttr: string }) {
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
        (active ? "border-b-2 border-primary text-text-primary" : "text-text-secondary hover:text-text-primary")
      }
    >
      {icon}
      <span className="truncate">{label}</span>
      {trailing}
    </button>
  );
}

function PrStatusIndicator({ workspaceId, featureId }: { workspaceId: string; featureId: string }) {
  const { data: prStatus, error: prStatusError } = useQuery({
    queryKey: workspaceKeys.documentPr(workspaceId, featureId),
    queryFn: () => getDocumentPrStatus(workspaceId, featureId),
    staleTime: 60_000,
  });

  if (prStatusError) return null;

  if (!prStatus || prStatus.state === "none") {
    return (
      <span data-pr-indicator="none" className="flex items-center gap-1 text-xs text-text-muted" title="No document PR">
        <GitPullRequest className="h-3.5 w-3.5" aria-hidden="true" />
        No PR
      </span>
    );
  }

  if (prStatus.state === "open" && prStatus.url) {
    return (
      <a
        href={prStatus.url}
        target="_blank"
        rel="noreferrer noopener"
        data-pr-indicator="open"
        className="flex items-center gap-1 text-xs text-success transition-colors hover:underline"
        title="View open document PR on GitHub"
      >
        <GitPullRequest className="h-3.5 w-3.5" aria-hidden="true" />
        PR open
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    );
  }

  if (prStatus.state === "merged") {
    return (
      <span data-pr-indicator="merged" className="flex items-center gap-1 text-xs text-text-muted" title="Document PR merged">
        <GitPullRequest className="h-3.5 w-3.5" aria-hidden="true" />
        PR merged
        {prStatus.url && (
          <a href={prStatus.url} target="_blank" rel="noreferrer noopener" className="ml-0.5 transition-opacity hover:opacity-80" title="View on GitHub">
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </span>
    );
  }

  return null;
}

export function FeatureIDEDocsPanel({ feature, activeTab, onTabChange }: FeatureIDEDocsPanelProps) {
  const hasProductSpec = feature.stages?.product_spec?.review_status === "approved";
  const hasTechnicalDesign = feature.stages?.technical_design?.review_status === "approved";

  return (
    <div data-feature-ide-docs-panel className="flex h-full flex-col overflow-hidden bg-bg">
      {/* Tab bar + PR indicator */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-2">
        <div role="tablist" aria-label="Feature documents" className="flex items-center gap-0">
          <DocTabButton
            label="Product Spec"
            icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
            trailing={hasProductSpec ? <Check className="h-3 w-3 text-success" aria-hidden="true" /> : undefined}
            active={activeTab === "product_spec"}
            onClick={() => onTabChange("product_spec")}
            dataAttr="data-docs-tab-product-spec"
          />
          <DocTabButton
            label="Tech Design"
            icon={<Code2 className="h-3.5 w-3.5" aria-hidden="true" />}
            trailing={hasTechnicalDesign ? <Check className="h-3 w-3 text-success" aria-hidden="true" /> : undefined}
            active={activeTab === "technical_design"}
            onClick={() => onTabChange("technical_design")}
            dataAttr="data-docs-tab-tech-design"
          />
        </div>
        <div className="pr-2">
          <PrStatusIndicator workspaceId={feature.workspace_id} featureId={feature.feature_id} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "product_spec" && <FeatureDocumentPanel feature={feature} documentType="product_spec" />}
        {activeTab === "technical_design" && <FeatureDocumentPanel feature={feature} documentType="technical_design" />}
      </div>
    </div>
  );
}
