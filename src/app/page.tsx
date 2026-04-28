import { StatCard } from "@/components/dashboard/stat-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { FeatureSummaryCard } from "@/components/dashboard/feature-summary-card";
import { WorkspaceAutoRedirect } from "@/components/dashboard/workspace-auto-redirect";
import { listFeatures, loadFeatureStatus } from "@/lib/features";
import { getWorkspaceByIdFromScan } from "@/lib/workspace";
import { buildActivityFeed } from "@/lib/activity";
import { listTasks, listAllTasksWithFeature } from "@/lib/tasks";
import type { FeatureSummary, LifecycleStage, StageReviewStatus } from "@/types/feature";
import type { AttentionTask } from "@/components/dashboard/needs-attention";
import type { FeatureSummaryCardProps } from "@/components/dashboard/feature-summary-card";

const ACTIVE_STATUSES = new Set<string>([
  "in_design",
  "in_tdd",
  "ready_for_implementation",
  "in_implementation",
  "in_handoff",
]);

const STAGE_KEYS = ["product_spec", "technical_design", "tasks", "handoff"] as const;

interface PageProps {
  searchParams: Promise<{ workspace?: string }>;
}

function computeStats(
  features: FeatureSummary[],
  tasksInProgress: number,
  awaitingReview: number
) {
  return {
    activeFeatures: features.filter(f => ACTIVE_STATUSES.has(f.featureStatus)).length,
    tasksInProgress,
    awaitingReview,
    blocked: features.filter(f => f.featureStatus === "blocked").length,
  };
}

export default async function Home({ searchParams }: PageProps) {
  const { workspace: workspaceId } = await searchParams;

  if (!workspaceId) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8">
        <WorkspaceAutoRedirect />
        <p className="text-sm text-text-muted">
          Select a workspace from the header to get started.
        </p>
      </div>
    );
  }

  const workspace = getWorkspaceByIdFromScan(workspaceId);
  if (!workspace) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-text-muted">
          Workspace{" "}
          <span className="font-mono text-text-primary">{workspaceId}</span>{" "}
          not found. Select another workspace from the header.
        </p>
      </div>
    );
  }

  const features = await listFeatures(workspaceId, workspace.rootPath);
  const allTasksWithFeature = listAllTasksWithFeature(workspace.rootPath);

  // Stat: tasks in progress
  const tasksInProgress = allTasksWithFeature.filter(x => x.task.status === "in_progress").length;

  // Stat: awaiting review (features with any stage in awaiting_approval)
  let awaitingReview = 0;
  const featureYamls = features.map(f => ({
    summary: f,
    yaml: loadFeatureStatus(workspace.rootPath, f.featureId),
  }));
  for (const { yaml } of featureYamls) {
    if (!yaml) continue;
    if (STAGE_KEYS.some(k => yaml.stages?.[k]?.review_status === "awaiting_approval")) {
      awaitingReview++;
    }
  }

  const stats = computeStats(features, tasksInProgress, awaitingReview);

  // Active feature cards data
  const activeFeatureCards: FeatureSummaryCardProps[] = featureYamls
    .filter(({ summary }) => ACTIVE_STATUSES.has(summary.featureStatus))
    .map(({ summary, yaml }) => {
      if (!yaml) return null;
      const tasks = listTasks(workspace.rootPath, summary.featureId);
      const doneTasks = tasks.filter(t => t.status === "done").length;
      const stageReviewStatuses: Partial<Record<LifecycleStage, StageReviewStatus>> = {};
      for (const k of STAGE_KEYS) {
        const rs = yaml.stages?.[k]?.review_status;
        if (rs) stageReviewStatuses[k] = rs;
      }
      const currentStageReviewStatus =
        stageReviewStatuses[summary.currentStage] ?? "draft";
      const history = yaml.history ?? [];
      const lastEntry = history[history.length - 1];
      return {
        featureId: summary.featureId,
        title: summary.title,
        currentStage: summary.currentStage,
        currentStageReviewStatus,
        stageReviewStatuses,
        totalTasks: tasks.length,
        doneTasks,
        lastUpdatedAt: lastEntry?.at != null ? String(lastEntry.at) : null,
      } satisfies FeatureSummaryCardProps;
    })
    .filter((x): x is FeatureSummaryCardProps => x !== null);

  // Needs Attention: blocked or in_review tasks
  const needsAttentionItems: AttentionTask[] = allTasksWithFeature
    .filter(x => x.task.status === "blocked" || x.task.status === "in_review")
    .map(({ featureId, task }) => ({
      taskId: task.id,
      taskTitle: task.title,
      featureId,
      repo: task.repo,
      status: task.status as "blocked" | "in_review",
    }));

  const activity = buildActivityFeed(features, workspace.rootPath);

  return (
    <div className="w-full space-y-8 p-8">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-muted">{workspace.config.name}</p>
      </div>

      {/* Stat cards */}
      <section aria-label="Workspace statistics">
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Active Features"
            count={stats.activeFeatures}
            subtitle="+1 this week"
            subtitleVariant="positive"
          />
          <StatCard
            label="Tasks In Progress"
            count={stats.tasksInProgress}
            subtitle="across all features"
            subtitleVariant="muted"
          />
          <StatCard
            label="Awaiting Review"
            count={stats.awaitingReview}
            subtitle="stages pending"
            subtitleVariant="muted"
            countVariant="warning"
          />
          <StatCard
            label="Blocked"
            count={stats.blocked}
            subtitle="needs attention"
            subtitleVariant="negative"
            countVariant="danger"
          />
        </div>
      </section>

      {/* Active Features horizontal scroll */}
      {activeFeatureCards.length > 0 && (
        <section aria-label="Active features">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-[16px] font-semibold leading-6 tracking-[-0.31px] text-text-primary">
                Active Features
              </h2>
              <p className="text-[13px] leading-[19.5px] text-text-secondary">
                Features currently moving through the lifecycle
              </p>
            </div>
            <a href="/features" className="text-[13px] font-medium leading-[19.5px] text-primary">
              View all →
            </a>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {activeFeatureCards.map(card => (
              <FeatureSummaryCard key={card.featureId} {...card} />
            ))}
          </div>
        </section>
      )}

      {/* Bottom: Needs Attention + Recent Activity */}
      <section aria-label="Attention and activity">
        <div className="grid grid-cols-3 gap-8">
          <NeedsAttention items={needsAttentionItems} />
          <RecentActivity entries={activity} />
        </div>
      </section>
    </div>
  );
}
