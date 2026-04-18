export type TaskStatus =
  | "todo"
  | "ready"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "done";

export interface ExecutionInfo {
  actor_type: string | null;
  last_updated_by: string | null;
  last_updated_at: string | null;
}

export interface PRInfo {
  url: string;
  status: "not_created" | "open" | "merged" | "closed" | string;
}

export interface LogEntry {
  action: string;
  by: string;
  at: string;
  note: string | null;
}

export interface BlockedContext {
  wip_branch: string;
  wip_sha: string;
  pushed_at: string;
}

export interface Task {
  id: string;
  title: string;
  repo: string;
  status: TaskStatus;
  depends_on: string[];
  blocked_reason: string | null;
  blocked_context: BlockedContext | null;
  branch: string;
  execution: ExecutionInfo;
  pr: PRInfo;
  workspace_pr: PRInfo | null;
  log: LogEntry[];
}
