import { Suspense } from "react";
import type { FeatureStatus } from "@/types/feature";
import { listFeatures } from "@/lib/features";
import { getWorkspaceByIdFromScan, scanWorkspaces } from "@/lib/workspace";
import { FilterPills } from "@/components/features/filter-pills";
import { FeaturesTable } from "@/components/features/features-table";
import { FeaturesWorkspaceBridge } from "@/components/features/features-workspace-bridge";
import { SearchInput } from "@/components/features/search-input";
import { NewFeatureModal } from "@/components/features/new-feature-modal";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    workspace?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function FeaturesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const workspaceId = params.workspace;
  const statusFilter = params.status as FeatureStatus | undefined;
  const searchQuery = params.search;

  // Load features for the active workspace, fall back to first discovered workspace
  let features: Awaited<ReturnType<typeof listFeatures>> = [];
  let resolvedWorkspaceId: string | undefined = workspaceId;

  if (workspaceId) {
    const ws = getWorkspaceByIdFromScan(workspaceId);
    if (ws) {
      features = await listFeatures(ws.config.workspace_id, ws.rootPath, {
        featureStatus: statusFilter,
      });
    }
  } else {
    const allWorkspaces = scanWorkspaces();
    if (allWorkspaces.length > 0) {
      const { rootPath, config } = allWorkspaces[0];
      resolvedWorkspaceId = config.workspace_id;
      features = await listFeatures(config.workspace_id, rootPath, {
        featureStatus: statusFilter,
      });
    }
  }

  const repos = resolvedWorkspaceId
    ? (getWorkspaceByIdFromScan(resolvedWorkspaceId)?.config.repos ?? [])
    : [];

  // Total unfiltered count for the "X of Y shown" label
  let totalAll = features.length;
  if (statusFilter && resolvedWorkspaceId) {
    const ws = getWorkspaceByIdFromScan(resolvedWorkspaceId);
    if (ws) {
      const allForWorkspace = await listFeatures(
        ws.config.workspace_id,
        ws.rootPath
      );
      totalAll = allForWorkspace.length;
    }
  }

  return (
    <div className="flex flex-col gap-5 p-8">
      {/* Workspace bridge: syncs localStorage active workspace → URL */}
      <Suspense>
        <FeaturesWorkspaceBridge serverWorkspaceId={workspaceId} />
      </Suspense>

      {/* Row 1: page title + count + New Feature button */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[22px] font-bold leading-tight text-text-primary">
            Features
          </h1>
          <p className="text-[13px] text-text-secondary">
            {features.length} of {totalAll} shown
          </p>
        </div>

        <NewFeatureModal
          existingFeatureIds={features.map((f) => f.featureId)}
          repos={repos}
        />
      </div>

      {/* Row 2: filter pills (left) + search box (right) */}
      <div className="flex items-center justify-between gap-4">
        <Suspense
          fallback={
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-full border border-primary bg-primary px-3 text-[11px] font-medium uppercase tracking-[0.5645px] text-white">
                All
              </span>
            </div>
          }
        >
          <FilterPills activeStatus={statusFilter} />
        </Suspense>

        <div className="flex h-9 w-[260px] shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className="shrink-0 text-text-muted"
          >
            <circle
              cx="5.5"
              cy="5.5"
              r="4.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M9 9L12.5 12.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <Suspense>
            <SearchInput defaultValue={searchQuery} />
          </Suspense>
        </div>
      </div>

      {/* Features table */}
      <FeaturesTable features={features} searchQuery={searchQuery} />
    </div>
  );
}
