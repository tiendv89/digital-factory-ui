import type { TaskStatus } from "@/types/task";
import { TaskCard, type TaskCardData } from "./task-card";

interface ColumnConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  columnBg: string;
}

const COLUMN_CONFIG: Record<TaskStatus, ColumnConfig> = {
  todo: {
    label: "Todo",
    badgeBg: "bg-surface-subtle",
    badgeText: "text-text-secondary",
    columnBg: "bg-surface-secondary",
  },
  ready: {
    label: "Ready",
    badgeBg: "bg-ready-bg",
    badgeText: "text-ready",
    columnBg: "bg-surface-secondary",
  },
  in_progress: {
    label: "In Progress",
    badgeBg: "bg-success-bg",
    badgeText: "text-success",
    columnBg: "bg-surface-secondary",
  },
  in_review: {
    label: "In Review",
    badgeBg: "bg-warning-bg",
    badgeText: "text-warning",
    columnBg: "bg-surface-secondary",
  },
  blocked: {
    label: "Blocked",
    badgeBg: "bg-danger-bg",
    badgeText: "text-danger",
    columnBg: "bg-danger-bg",
  },
  done: {
    label: "Done",
    badgeBg: "bg-primary-light",
    badgeText: "text-primary",
    columnBg: "bg-surface-secondary",
  },
  cancelled: {
    label: "Cancelled",
    badgeBg: "bg-surface-subtle",
    badgeText: "text-text-secondary",
    columnBg: "bg-surface-secondary",
  },
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskCardData[];
}

export function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  const config = COLUMN_CONFIG[status];

  return (
    <div
      className={`flex w-[280px] shrink-0 flex-col gap-3 rounded-xl p-3 ${config.columnBg}`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${config.badgeBg} ${config.badgeText}`}
        >
          {config.label}
        </span>
        <span className="text-xs text-text-muted">{tasks.length}</span>
      </div>

      {/* Task cards or empty state */}
      {tasks.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-8">
          <span className="text-sm text-text-muted">Empty</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard key={`${task.featureId}-${task.id}`} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
