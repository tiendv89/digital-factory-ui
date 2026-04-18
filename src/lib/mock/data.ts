// Mock data types — inline for T2 prototype (no external types yet)

export type FeatureStage =
  | "in_design"
  | "in_tdd"
  | "in_implementation"
  | "blocked"
  | "done";

export type ReviewStatus = "pending" | "approved" | "rejected" | "not_required";

export type TaskStatus =
  | "todo"
  | "ready"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "done";

export interface MockTask {
  id: string;
  title: string;
  status: TaskStatus;
  repo: string;
  actor_type: "agent" | "human";
  depends_on: string[];
  blocked_reason: string | null;
  pr_url: string | null;
}

export interface MockFeature {
  id: string;
  title: string;
  stage: FeatureStage;
  review_status: ReviewStatus;
  next_action: string;
  tasks: MockTask[];
}

export type MockFeatureSummary = Omit<MockFeature, "tasks"> & {
  task_counts: {
    total: number;
    done: number;
    blocked: number;
    ready: number;
    in_progress: number;
    in_review: number;
  };
};

// ---------------------------------------------------------------------------
// Mock features
// ---------------------------------------------------------------------------

const FEATURES: MockFeature[] = [
  {
    id: "feature-status-dashboard",
    title: "Feature & Task Status Visualization Dashboard",
    stage: "in_implementation",
    review_status: "approved",
    next_action: "Complete T2 mock prototype",
    tasks: [
      {
        id: "T1",
        title: "Initialize Next.js project in digital-factory-ui",
        status: "done",
        repo: "digital-factory-ui",
        actor_type: "agent",
        depends_on: [],
        blocked_reason: null,
        pr_url: "https://github.com/tiendv89/digital-factory-ui/pull/1",
      },
      {
        id: "T2",
        title: "Mock data UI prototype — both pages with hardcoded data",
        status: "in_progress",
        repo: "digital-factory-ui",
        actor_type: "agent",
        depends_on: ["T1"],
        blocked_reason: null,
        pr_url: null,
      },
      {
        id: "T3",
        title: "Data layer — types, FeatureRepository interface, FilesystemFeatureRepository",
        status: "ready",
        repo: "digital-factory-ui",
        actor_type: "agent",
        depends_on: ["T1"],
        blocked_reason: null,
        pr_url: null,
      },
      {
        id: "T4",
        title: "Features list page (/) — wire real data",
        status: "todo",
        repo: "digital-factory-ui",
        actor_type: "agent",
        depends_on: ["T2", "T3"],
        blocked_reason: null,
        pr_url: null,
      },
      {
        id: "T5",
        title: "Feature detail page (/features/[id]) — wire real data",
        status: "blocked",
        repo: "digital-factory-ui",
        actor_type: "agent",
        depends_on: ["T4"],
        blocked_reason: "Waiting for T4 to establish real-data wiring pattern",
        pr_url: null,
      },
    ],
  },
  {
    id: "user-auth",
    title: "User Authentication & Authorization",
    stage: "in_design",
    review_status: "pending",
    next_action: "Awaiting product owner approval on design spec",
    tasks: [
      {
        id: "T1",
        title: "Write product spec for authentication flow",
        status: "done",
        repo: "backend-api",
        actor_type: "human",
        depends_on: [],
        blocked_reason: null,
        pr_url: null,
      },
      {
        id: "T2",
        title: "Technical design for JWT + session management",
        status: "in_review",
        repo: "backend-api",
        actor_type: "human",
        depends_on: ["T1"],
        blocked_reason: null,
        pr_url: "https://github.com/tiendv89/backend-api/pull/12",
      },
    ],
  },
  {
    id: "data-pipeline-v2",
    title: "Data Pipeline v2 — Streaming Ingest",
    stage: "in_tdd",
    review_status: "pending",
    next_action: "Complete technical design review",
    tasks: [
      {
        id: "T1",
        title: "Define streaming ingest architecture",
        status: "done",
        repo: "data-pipeline",
        actor_type: "human",
        depends_on: [],
        blocked_reason: null,
        pr_url: null,
      },
      {
        id: "T2",
        title: "Write technical design for Kafka integration",
        status: "in_review",
        repo: "data-pipeline",
        actor_type: "agent",
        depends_on: ["T1"],
        blocked_reason: null,
        pr_url: "https://github.com/tiendv89/data-pipeline/pull/5",
      },
      {
        id: "T3",
        title: "Define consumer group strategy",
        status: "ready",
        repo: "data-pipeline",
        actor_type: "agent",
        depends_on: ["T1"],
        blocked_reason: null,
        pr_url: null,
      },
    ],
  },
  {
    id: "api-gateway-migration",
    title: "API Gateway Migration to Kong",
    stage: "blocked",
    review_status: "approved",
    next_action: "Unblock infra provisioning before proceeding",
    tasks: [
      {
        id: "T1",
        title: "Set up Kong gateway in dev environment",
        status: "blocked",
        repo: "infra",
        actor_type: "human",
        depends_on: [],
        blocked_reason:
          "Cloud provider account limit reached — infra team must raise quota before proceeding",
        pr_url: null,
      },
      {
        id: "T2",
        title: "Migrate /api/users routes to Kong",
        status: "todo",
        repo: "backend-api",
        actor_type: "agent",
        depends_on: ["T1"],
        blocked_reason: null,
        pr_url: null,
      },
    ],
  },
  {
    id: "reporting-dashboard",
    title: "Executive Reporting Dashboard",
    stage: "done",
    review_status: "approved",
    next_action: "Released — no further action",
    tasks: [
      {
        id: "T1",
        title: "Build metrics aggregation service",
        status: "done",
        repo: "backend-api",
        actor_type: "agent",
        depends_on: [],
        blocked_reason: null,
        pr_url: "https://github.com/tiendv89/backend-api/pull/8",
      },
      {
        id: "T2",
        title: "Build dashboard UI with charts",
        status: "done",
        repo: "frontend-ui",
        actor_type: "agent",
        depends_on: ["T1"],
        blocked_reason: null,
        pr_url: "https://github.com/tiendv89/frontend-ui/pull/15",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Derived data helpers
// ---------------------------------------------------------------------------

function computeTaskCounts(
  tasks: MockTask[]
): MockFeatureSummary["task_counts"] {
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
    ready: tasks.filter((t) => t.status === "ready").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    in_review: tasks.filter((t) => t.status === "in_review").length,
  };
}

export function getMockFeatureSummaries(): MockFeatureSummary[] {
  return FEATURES.map(({ tasks, ...rest }) => ({
    ...rest,
    task_counts: computeTaskCounts(tasks),
  }));
}

export function getMockFeatureById(id: string): MockFeature | null {
  return FEATURES.find((f) => f.id === id) ?? null;
}

export function getMockTasksByFeatureId(featureId: string): MockTask[] {
  return FEATURES.find((f) => f.id === featureId)?.tasks ?? [];
}
