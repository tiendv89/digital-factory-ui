import { Suspense } from "react";
import { Plus } from "lucide-react";
import type { FeatureStatus } from "@/types/feature";
import { listFeatures } from "@/lib/features";
import { getWorkspaceByIdFromScan, scanWorkspaces } from "@/lib/workspace";
import { FilterPills } from "@/components/features/FilterPills";
import { FeaturesTable } from "@/components/features/FeaturesTable";
import { FeaturesWorkspaceBridge } from "@/components/features/FeaturesWorkspaceBridge";
import { SearchInput } from "@/components/features/SearchInput";

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

  // Load features for the active workspace, or fall back to the first workspace
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

  // Total count without status filter for the "X of Y shown" label
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
    <div className="flex flex-col gap-6 p-8">
      {/* Workspace bridge: syncs localStorage → URL so server gets the right workspace */}
      <Suspense>
        <FeaturesWorkspaceBridge serverWorkspaceId={workspaceId} />
      </Suspense>

      {/* Header row: title + count + New Feature button */}
      <div className="flex items-start justify-between gap-4">
        <Suspense
          fallback={
            <div className="flex flex-col gap-1">
              <h1 className="text-[20px] font-semibold text-(--color-text-primary)">
                Features
              </h1>
            </div>
          }
        >
          <FilterPills
            activeStatus={statusFilter}
            totalShown={features.length}
            totalAll={totalAll}
          />
        </Suspense>

        <button
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <Plus size={14} aria-hidden="true" />
          New Feature
        </button>
      </div>

      {/* Search bar */}
      <div
        className="flex items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2"
        style={{ maxWidth: 320 }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-(--color-text-muted)"
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

      {/* Features table */}
      <FeaturesTable features={features} searchQuery={searchQuery} />
    </div>
  );
}
