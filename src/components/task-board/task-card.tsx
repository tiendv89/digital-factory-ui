import type { TaskStatus, ActorType } from "@/types/task";
import { ExternalLink, Bot, User, Users } from "lucide-react";

export interface TaskCardData {
  id: string;
  title: string;
  featureId: string;
  repo: string;
  status: TaskStatus;
  actorType: ActorType;
  dependsOnCount: number;
  prUrl: string | null;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; borderColor: string; badgeBg: string; badgeText: string }
> = {
  todo: {
    label: "Todo",
    borderColor: "#8892b5",
    badgeBg: "bg-surface-subtle",
    badgeText: "text-text-secondary",
  },
  ready: {
    label: "Ready",
    borderColor: "#2595cc",
    badgeBg: "bg-ready-bg",
    badgeText: "text-ready",
  },
  in_progress: {
    label: "In Progress",
    borderColor: "#17a674",
    badgeBg: "bg-success-bg",
    badgeText: "text-success",
  },
  in_review: {
    label: "In Review",
    borderColor: "#ffb547",
    badgeBg: "bg-warning-bg",
    badgeText: "text-warning",
  },
  blocked: {
    label: "Blocked",
    borderColor: "#ff5e7d",
    badgeBg: "bg-danger-bg",
    badgeText: "text-danger",
  },
  done: {
    label: "Done",
    borderColor: "#5465e8",
    badgeBg: "bg-primary-light",
    badgeText: "text-primary",
  },
  cancelled: {
    label: "Cancelled",
    borderColor: "#8892b5",
    badgeBg: "bg-surface-subtle",
    badgeText: "text-text-secondary",
  },
};

const ACTOR_ICONS: Record<ActorType, React.ElementType> = {
  agent: Bot,
  human: User,
  either: Users,
};

interface TaskCardProps {
  task: TaskCardData;
}

export function TaskCard({ task }: TaskCardProps) {
  const config = STATUS_CONFIG[task.status];
  const ActorIcon = ACTOR_ICONS[task.actorType];

  return (
    <div className="flex overflow-hidden rounded-xl bg-surface shadow-sm">
      {/* Left color-coded accent border */}
      <div className="w-[3px] shrink-0" style={{ backgroundColor: config.borderColor }} />

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2 px-3.5 py-3">
        {/* Feature tag chip */}
        <div className="flex">
          <span className="rounded bg-chip-bg font-mono text-[10px] leading-tight text-text-muted">
            {task.featureId}
          </span>
        </div>

        {/* Task ID + actor icon */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-text-secondary">{task.id}</span>
          <ActorIcon size={11} className="text-text-muted" aria-hidden="true" />
        </div>

        {/* Title */}
        <p className="text-sm leading-snug text-text-primary">{task.title}</p>

        {/* Repo chip + dep count + status badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="rounded border border-border px-1.5 py-0.5 text-[11px] leading-tight text-text-secondary">
              {task.repo}
            </span>
            {task.dependsOnCount > 0 && (
              <span className="rounded bg-chip-bg px-1.5 py-0.5 text-[10px] leading-tight text-text-secondary">
                {task.dependsOnCount} dep{task.dependsOnCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.badgeBg} ${config.badgeText}`}
          >
            {config.label}
          </span>
        </div>

        {/* PR link */}
        {task.prUrl && (
          <a
            href={task.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <ExternalLink size={10} aria-hidden="true" />
            View PR
          </a>
        )}
      </div>
    </div>
  );
}
