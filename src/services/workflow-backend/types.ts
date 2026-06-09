export type WorkspaceId = string;
export type FeatureId = string;
export type TaskId = string;
export type FeatureName = string;
export type TaskName = string;

export type SourceState = {
  stale: boolean;
  last_synced_at?: string;
  error_code?: string;
};

export type TaskCounts = {
  total: number;
  done: number;
  in_progress: number;
  blocked: number;
  ready: number;
  todo: number;
};

export type PullRequestRef = {
  label?: string | null;
  status?: string | null;
  repo?: string | null;
  url?: string | null;
};

export type TaskLogEntry = {
  action: string;
  by: string;
  at: string;
  note?: string;
};

export type ActivityEvent = {
  action: string;
  scope: string;
  actor: string;
  occurred_at: string;
  note?: string;
  feature_id?: string;
  task_id?: string;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  repo_url: string;
  source_state: SourceState;
  updated_at: string;
};

export type LocalWorkspaceSummary = {
  workspaceId: string;
  name: string;
  repo_url: string;
  default_branch: string;
  last_opened_at: string;
};

export type StageReview = {
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_status?: string | null;
  review_comment?: string | null;
  review_history?: Array<{
    at: string;
    by: string;
    status: string;
    comment?: string | null;
  }>;
};

export type FeatureSummary = {
  id: string;
  feature_id: string;
  feature_name: string;
  title: string;
  status: string;
  current_stage: string;
  stages?: Record<string, StageReview>;
  updated_at: string;
  task_counts: TaskCounts;
};

export type PagedFeatures = {
  items: FeatureSummary[];
  total: number;
  page: number;
  limit: number;
};

export type FeatureDocument = {
  document_type: string;
  source_path: string;
  url: string;
  content?: string;
};

export type TaskExecution = {
  actor_type: string;
  last_updated_by?: string;
  last_updated_at?: string;
};

export type TaskSummary = {
  id: string;
  task_id: string;
  task_name: string;
  feature_id: string;
  feature_name: string;
  title: string;
  status: string;
  repo: string;
  branch: string;
  is_blocked: boolean;
  pr?: PullRequestRef | null;
  workspace_pr?: PullRequestRef | null;
  description?: string;
  priority?: string;
  blocked_reason?: string;
  blocked_context?: Record<string, unknown>;
  depends_on?: string[];
  execution?: TaskExecution;
  log?: TaskLogEntry[];
};

export type TaskSummaryWithUpdatedAt = TaskSummary & {
  updated_at: string;
};

export type FeatureWithTasks = FeatureSummary & {
  tasks: TaskSummaryWithUpdatedAt[];
};

export type FeatureTaskPage = {
  id: string;
  name: string;
  slug: string;
  page: number;
  limit: number;
  total: number;
  features: FeatureWithTasks[];
};

export type PagedTasks = {
  items: TaskSummary[];
  total: number;
  page: number;
  limit: number;
};

export type WorkspaceDetail = WorkspaceSummary & {
  features: FeatureSummary[];
  tasks: TaskSummary[];
};

export type FeatureDetail = FeatureSummary & {
  workspace_id: string;
  documents: FeatureDocument[];
  tasks: TaskSummary[];
  activity?: ActivityEvent[];
  source_state: SourceState;
};

export type TaskDetail = TaskSummary & {
  next_action: string;
  blocked_reason: string;
  workspace_id: string;
  depends_on: string[];
  execution: TaskExecution;
  pr_refs?: PullRequestRef[];
  activity?: ActivityEvent[];
};

export type ImportWorkspaceRequest = {
  repo_url: string;
  default_branch?: string;
  name?: string;
};

export type CreateFeatureRequest = {
  name: string;
  description?: string;
  start_stage?: string;
};

export type ApiError = {
  code: string;
  message: string;
  retryable: boolean;
  path?: string;
  cached_data?: unknown;
};
