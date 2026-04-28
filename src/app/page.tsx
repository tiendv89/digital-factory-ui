import { LayoutGrid, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { WorkspaceAutoRedirect } from "@/components/dashboard/WorkspaceAutoRedirect";
import { listFeatures } from "@/lib/features";
import { getWorkspaceByIdFromScan } from "@/lib/workspace";
import { buildActivityFeed } from "@/lib/activity";
import type { FeatureSummary } from "@/types/feature";

interface PageProps {
  searchParams: Promise<{ workspace?: string }>;
}

function computeStats(features: FeatureSummary[]) {
  const IN_PROGRESS_STATUSES = new Set([
    "in_design",
    "in_tdd",
    "ready_for_implementation",
    "in_implementation",
    "in_handoff",
  ]);

  return {
    total: features.length,
    inProgress: features.filter((f) => IN_PROGRESS_STATUSES.has(f.featureStatus)).length,
    blocked: features.filter((f) => f.featureStatus === "blocked").length,
    done: features.filter((f) => f.featureStatus === "done").length,
  };
}

export default async function Home({ searchParams }: PageProps) {
  const { workspace: workspaceId } = await searchParams;

  if (!workspaceId) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8">
        <WorkspaceAutoRedirect />
        <p className="text-sm text-(--color-text-muted)">
          Select a workspace from the header to get started.
        </p>
      </div>
    );
  }

  const workspace = getWorkspaceByIdFromScan(workspaceId);
  if (!workspace) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-(--color-text-muted)">
          Workspace{" "}
          <span className="font-mono text-(--color-text-primary)">{workspaceId}</span>{" "}
          not found. Select another workspace from the header.
        </p>
      </div>
    );
  }

  const features = await listFeatures(workspaceId, workspace.rootPath);
  const stats = computeStats(features);
  const activity = buildActivityFeed(features, workspace.rootPath);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-semibold text-(--color-text-primary)">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          {workspace.config.name}
        </p>
      </div>

      {/* Stat cards */}
      <section aria-label="Workspace statistics">
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Total Features"
            count={stats.total}
            Icon={LayoutGrid}
            variant="muted"
          />
          <StatCard
            label="In Progress"
            count={stats.inProgress}
            Icon={Activity}
            variant="primary"
          />
          <StatCard
            label="Blocked"
            count={stats.blocked}
            Icon={AlertCircle}
            variant="danger"
          />
          <StatCard
            label="Done"
            count={stats.done}
            Icon={CheckCircle2}
            variant="success"
          />
        </div>
      </section>

      {/* Recent activity */}
      <section aria-label="Recent activity">
        <RecentActivity entries={activity} />
      </section>
    </div>
  );
}
