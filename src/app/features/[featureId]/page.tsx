import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import type { FeatureStatus } from "@/types/feature";
import { loadFeatureStatus } from "@/lib/features";
import { listTasks } from "@/lib/tasks";
import { getWorkspaceByIdFromScan, scanWorkspaces } from "@/lib/workspace";
import { formatRelativeTime } from "@/lib/utils";
import { StageStepper } from "@/components/feature-detail/stage-stepper";
import { ReviewCard } from "@/components/feature-detail/review-card";
import { TaskTable } from "@/components/feature-detail/task-table";
import { FeatureDetailWorkspaceBridge } from "@/components/feature-detail/feature-detail-workspace-bridge";

export const dynamic = "force-dynamic";

const FEATURE_STATUS_BADGE: Record<FeatureStatus, { bg: string; color: string; label: string }> = {
  in_design: { bg: "var(--color-primary-light)", color: "var(--color-primary)", label: "In Design" },
  in_tdd: { bg: "var(--color-ready-bg)", color: "var(--color-ready)", label: "In TDD" },
  ready_for_implementation: { bg: "var(--color-ready-bg)", color: "var(--color-ready)", label: "Ready" },
  in_implementation: { bg: "var(--color-success-bg)", color: "var(--color-success)", label: "In Implementation" },
  in_handoff: { bg: "var(--color-warning-bg)", color: "var(--color-warning)", label: "In Handoff" },
  done: { bg: "var(--color-primary-light)", color: "var(--color-primary)", label: "Done" },
  blocked: { bg: "var(--color-danger-bg)", color: "var(--color-danger)", label: "Blocked" },
  cancelled: { bg: "var(--color-border)", color: "var(--color-text-muted)", label: "Cancelled" },
};

interface PageProps {
  params: Promise<{ featureId: string }>;
  searchParams: Promise<{ workspace?: string }>;
}

export default async function FeatureDetailPage({ params, searchParams }: PageProps) {
  const { featureId } = await params;
  const { workspace: workspaceId } = await searchParams;

  // Resolve workspace: use URL param or fall back to first discovered workspace
  let resolvedWorkspaceId = workspaceId;
  let workspaceRoot: string | undefined;

  if (workspaceId) {
    const ws = getWorkspaceByIdFromScan(workspaceId);
    if (ws) workspaceRoot = ws.rootPath;
  }

  if (!workspaceRoot) {
    const all = scanWorkspaces();
    if (all.length > 0) {
      workspaceRoot = all[0].rootPath;
      resolvedWorkspaceId = all[0].config.workspace_id;
    }
  }

  if (!workspaceRoot || !resolvedWorkspaceId) {
    notFound();
  }

  const featureStatus = loadFeatureStatus(workspaceRoot, featureId);
  if (!featureStatus) {
    notFound();
  }

  const tasks = listTasks(workspaceRoot, featureId);
  const lastHistoryEntry = featureStatus.history[featureStatus.history.length - 1];
  const lastUpdatedAt = lastHistoryEntry?.at ?? null;
  const badge = FEATURE_STATUS_BADGE[featureStatus.feature_status];

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Workspace bridge: syncs localStorage active workspace → URL */}
      <Suspense>
        <FeatureDetailWorkspaceBridge serverWorkspaceId={workspaceId} />
      </Suspense>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1">
        <Link
          href="/features"
          className="text-[16px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Features
        </Link>
        <ChevronRight size={14} className="shrink-0 text-text-muted" aria-hidden="true" />
        <span className="font-mono text-[13px] text-text-primary">{featureId}</span>
      </nav>

      {/* Feature header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-3">
          <h1 className="text-[22px] font-bold leading-tight text-text-primary">
            {featureStatus.title}
          </h1>
          <span
            className="mt-1 inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium leading-none"
            style={{ backgroundColor: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
        </div>
        <p className="font-mono text-[12px] text-text-muted">
          {featureId}
          {lastUpdatedAt && ` · last updated ${formatRelativeTime(lastUpdatedAt)}`}
        </p>
      </div>

      {/* Stage stepper */}
      <StageStepper status={featureStatus} />

      {/* Review card for current stage */}
      <ReviewCard
        workspaceId={resolvedWorkspaceId}
        featureId={featureId}
        stage={featureStatus.current_stage}
        review={featureStatus.stages[featureStatus.current_stage]}
      />

      {/* Tasks section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-text-primary">
            Tasks ({tasks.length})
          </h2>
        </div>
        <TaskTable tasks={tasks} />
      </div>
    </div>
  );
}
