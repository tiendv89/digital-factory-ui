"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Code2, ExternalLink, FileText, GitPullRequest, ListChecks, Rocket } from "lucide-react";
import { type ReactNode } from "react";

import { FeatureDocumentPanel } from "@/components/board/feature-document-panel";
import { workspaceKeys } from "@/constants/query-keys";
import { getDocumentPrStatus } from "@/services/workflow-backend/documents";
import type { FeatureDetail } from "@/services/workflow-backend/types";

export type DocTab = "product_spec" | "technical_design" | "tasks" | "handoff";

type FeatureIDEDocsPanelProps = {
  feature: FeatureDetail;
  activeTab: DocTab;
  onTabChange: (tab: DocTab) => void;
};

export type InitPRBadgeState = "none" | "in_pr" | "verified";

export function getInitPRBadgeState(initPrUrl: string | undefined | null, initPrMerged: boolean): InitPRBadgeState {
  if (!initPrUrl) return "none";
  return initPrMerged ? "verified" : "in_pr";
}

function InitPRBadge({ initPrMerged }: { initPrMerged: boolean }) {
  if (initPrMerged) {
    return (
      <span
        data-init-pr-badge="verified"
        className="ml-1 inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
        style={{ backgroundColor: "oklch(0.4 0.15 145 / 0.25)", color: "oklch(0.75 0.18 145)" }}
        title="Init PR merged — document is on main"
      >
        verified
      </span>
    );
  }
  return (
    <span
      data-init-pr-badge="in-pr"
      className="ml-1 inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: "oklch(0.5 0.15 80 / 0.25)", color: "oklch(0.75 0.15 80)" }}
      title="Document is on the init branch — not yet merged to main"
    >
      in PR
    </span>
  );
}

// DocTabButton renders a VS Code-style editor tab: the active tab lifts to the
// editor background with a blue top accent; inactive tabs sit on the tab strip.
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
        "group relative inline-flex h-9 min-w-0 items-center gap-2 border-r border-border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary " +
        (active ? "bg-bg text-text-primary" : "bg-surface text-text-secondary hover:bg-surface-subtle hover:text-text-primary")
      }
    >
      {active && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-primary" />}
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
  const hasTasks = feature.stages?.tasks?.review_status === "approved";
  const hasHandoff = feature.stages?.handoff?.review_status === "approved";

  const initPrUrl = feature.init_pr_url;
  const initPrMerged = feature.init_pr_merged;
  const badgeState = getInitPRBadgeState(initPrUrl, initPrMerged);
  const initPrBadge = badgeState !== "none" ? <InitPRBadge initPrMerged={initPrMerged} /> : undefined;

  return (
    <div data-feature-ide-docs-panel className="flex h-full flex-col overflow-hidden bg-bg">
      {/* Editor tab strip + PR indicator */}
      <div className="flex shrink-0 items-stretch justify-between border-b border-border bg-surface">
        <div role="tablist" aria-label="Feature documents" className="flex items-stretch">
          <DocTabButton
            label="Product Spec"
            icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
            trailing={
              <>
                {hasProductSpec && <Check className="h-3 w-3 text-success" aria-hidden="true" />}
                {initPrBadge}
              </>
            }
            active={activeTab === "product_spec"}
            onClick={() => onTabChange("product_spec")}
            dataAttr="data-docs-tab-product-spec"
          />
          <DocTabButton
            label="Tech Design"
            icon={<Code2 className="h-3.5 w-3.5" aria-hidden="true" />}
            trailing={
              <>
                {hasTechnicalDesign && <Check className="h-3 w-3 text-success" aria-hidden="true" />}
                {initPrBadge}
              </>
            }
            active={activeTab === "technical_design"}
            onClick={() => onTabChange("technical_design")}
            dataAttr="data-docs-tab-tech-design"
          />
          <DocTabButton
            label="Tasks"
            icon={<ListChecks className="h-3.5 w-3.5" aria-hidden="true" />}
            trailing={
              <>
                {hasTasks && <Check className="h-3 w-3 text-success" aria-hidden="true" />}
                {initPrBadge}
              </>
            }
            active={activeTab === "tasks"}
            onClick={() => onTabChange("tasks")}
            dataAttr="data-docs-tab-tasks"
          />
          <DocTabButton
            label="Handoff"
            icon={<Rocket className="h-3.5 w-3.5" aria-hidden="true" />}
            trailing={hasHandoff ? <Check className="h-3 w-3 text-success" aria-hidden="true" /> : undefined}
            active={activeTab === "handoff"}
            onClick={() => onTabChange("handoff")}
            dataAttr="data-docs-tab-handoff"
          />
        </div>
        <div className="flex items-center pr-3">
          <PrStatusIndicator workspaceId={feature.workspace_id} featureId={feature.feature_id} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "product_spec" && <FeatureDocumentPanel feature={feature} documentType="product_spec" />}
        {activeTab === "technical_design" && <FeatureDocumentPanel feature={feature} documentType="technical_design" />}
        {activeTab === "tasks" && <FeatureDocumentPanel feature={feature} documentType="tasks" />}
        {activeTab === "handoff" && <FeatureDocumentPanel feature={feature} documentType="handoff" />}
      </div>
    </div>
  );
}
