import Link from "next/link";
import type { TaskYaml, TaskStatus, ActorType } from "@/types/task";
import { formatRelativeTime } from "@/lib/utils";

const TASK_STATUS_BADGE: Record<TaskStatus, { className: string; label: string }> = {
  todo: { className: "bg-border text-text-muted", label: "Todo" },
  ready: { className: "bg-ready-bg text-ready", label: "Ready" },
  in_progress: { className: "bg-success-bg text-success", label: "In Progress" },
  blocked: { className: "bg-danger-bg text-danger", label: "Blocked" },
  in_review: { className: "bg-warning-bg text-warning", label: "In Review" },
  done: { className: "bg-primary-light text-primary", label: "Done" },
  cancelled: { className: "bg-border text-text-muted", label: "Cancelled" },
};

const ACTOR_LABEL: Record<ActorType, string> = {
  agent: "agent",
  human: "human",
  either: "either",
};

function StatusBadge({ status }: { status: TaskStatus }) {
  const { className, label } = TASK_STATUS_BADGE[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${className}`}>
      {label}
    </span>
  );
}

function getLastUpdated(task: TaskYaml): string | null {
  const lastLog = task.log[task.log.length - 1];
  return lastLog?.at ?? null;
}

interface TaskTableProps {
  tasks: TaskYaml[];
}

export function TaskTable({ tasks }: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-border bg-surface">
        <p className="text-sm text-text-muted">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {/* Table header */}
      <div
        className="grid items-center bg-surface-secondary px-5 py-3"
        style={{ gridTemplateColumns: "60px 2fr 1fr 1fr 90px 80px 90px 100px" }}
      >
        {(["ID", "Title", "Status", "Repo", "Actor", "PR", "Deps", "Updated"] as const).map(
          (col) => (
            <span key={col} className="text-[11px] font-medium text-text-muted">
              {col}
            </span>
          )
        )}
      </div>

      {/* Table rows */}
      <ul role="list" className="divide-y divide-border">
        {tasks.map((task) => (
          <li key={task.id}>
            <div
              className="grid items-center px-5 py-4"
              style={{
                gridTemplateColumns: "60px 2fr 1fr 1fr 90px 80px 90px 100px",
              }}
            >
              {/* ID */}
              <div>
                <span className="font-mono text-[13px] text-text-secondary">{task.id}</span>
              </div>

              {/* Title */}
              <div className="min-w-0 pr-4">
                <p className="truncate text-[14px] font-medium text-text-primary">{task.title}</p>
              </div>

              {/* Status */}
              <div>
                <StatusBadge status={task.status} />
              </div>

              {/* Repo */}
              <div className="min-w-0 pr-2">
                <span className="truncate text-[12px] font-medium text-text-secondary">
                  {task.repo}
                </span>
              </div>

              {/* Actor */}
              <div>
                <span className="text-[12px] font-medium text-text-secondary">
                  {ACTOR_LABEL[task.execution.actor_type]}
                </span>
              </div>

              {/* PR */}
              <div>
                {task.pr?.url ? (
                  <Link
                    href={task.pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-medium text-primary hover:underline"
                  >
                    PR
                  </Link>
                ) : (
                  <span className="text-[12px] font-medium text-text-muted">—</span>
                )}
              </div>

              {/* Deps */}
              <div>
                <span className="text-[12px] font-medium text-text-secondary">
                  {task.depends_on.length > 0 ? task.depends_on.join(", ") : "—"}
                </span>
              </div>

              {/* Updated */}
              <div>
                <span className="text-[12px] text-text-muted">
                  {formatRelativeTime(getLastUpdated(task))}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
