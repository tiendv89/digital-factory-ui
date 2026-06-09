"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight,
  Code2,
  FileText,
  Hash,
  List,
  MessageSquare,
  Plus,
} from "lucide-react";
import { listChatSessions } from "@/services/workflow-backend/chat";
import type { ChatSessionSummary } from "@/services/workflow-backend/chat";
import { clientFeatureStatusLabel, getFeatureStatusColor } from "@/features/board/lib/status";
import { formatTimestamp } from "@/lib/time";
import type { FeatureDetail, TaskSummary } from "@/services/workflow-backend/types";

const TASK_STATUS_ICON: Record<string, { symbol: string; colorClass: string }> = {
  done:             { symbol: "✓", colorClass: "text-success" },
  in_progress:      { symbol: "●", colorClass: "text-warning" },
  in_review:        { symbol: "◌", colorClass: "text-purple" },
  reviewing:        { symbol: "◌", colorClass: "text-purple" },
  review_passed:    { symbol: "◌", colorClass: "text-purple" },
  change_requested: { symbol: "◌", colorClass: "text-purple" },
  blocked:          { symbol: "⊗", colorClass: "text-danger" },
  ready:            { symbol: "→", colorClass: "text-ready" },
  todo:             { symbol: "○", colorClass: "text-text-muted" },
  cancelled:        { symbol: "○", colorClass: "text-text-muted" },
};

type DocTab = "product_spec" | "technical_design" | "tasks" | "logs";

export type FeatureIDEExplorerProps = {
  feature: FeatureDetail;
  workspaceId: string;
  featureId: string;
  activeDocTab: DocTab;
  onDocTabChange: (tab: DocTab) => void;
  selectedSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
};

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 pb-1 pt-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </span>
    </div>
  );
}

function ArtifactRow({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors " +
        (active
          ? "bg-surface-subtle text-text-primary"
          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary")
      }
    >
      <span className="shrink-0 text-text-muted">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {active && (
        <ChevronRight className="h-3 w-3 shrink-0 text-text-muted" aria-hidden="true" />
      )}
    </button>
  );
}

function TaskRow({ task }: { task: TaskSummary }) {
  const icon = TASK_STATUS_ICON[task.status] ?? { symbol: "○", colorClass: "text-text-muted" };
  return (
    <div
      data-task-row
      className="flex items-start gap-1.5 px-3 py-1"
    >
      <span className={"shrink-0 text-[10px] font-bold leading-5 " + icon.colorClass}>
        {icon.symbol}
      </span>
      <span className="flex-1 truncate text-[11px] leading-5 text-text-secondary">
        {task.task_name && (
          <span className="mr-1 font-mono text-text-muted">{task.task_name}</span>
        )}
        {task.title || task.task_name}
      </span>
    </div>
  );
}

function SessionRow({
  session,
  active,
  onClick,
}: {
  session: ChatSessionSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-session-row={session.id}
      className={
        "flex w-full items-start gap-2 px-3 py-1.5 text-left text-xs transition-colors " +
        (active
          ? "bg-surface-subtle text-text-primary"
          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary")
      }
    >
      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium leading-4">
          {session.title || `Session ${session.id.slice(-6)}`}
        </p>
        {session.last_active_at > 0 && (
          <p className="text-[10px] text-text-muted">
            {formatTimestamp(new Date(session.last_active_at).toISOString())}
          </p>
        )}
      </div>
    </button>
  );
}

export function FeatureIDEExplorer({
  feature,
  workspaceId,
  featureId,
  activeDocTab,
  onDocTabChange,
  selectedSessionId,
  onSessionSelect,
  onNewSession,
}: FeatureIDEExplorerProps) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const list = await listChatSessions(workspaceId, featureId);
      setSessions(list);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [workspaceId, featureId]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  const statusColor = getFeatureStatusColor(feature.status);
  const statusLabel = clientFeatureStatusLabel(feature.status);
  const tasks = feature.tasks ?? [];

  return (
    <div
      data-feature-ide-explorer
      className="flex h-full flex-col overflow-hidden bg-surface"
    >
      {/* Feature header */}
      <div className="shrink-0 border-b border-border px-3 py-3">
        <p className="truncate text-[11px] font-semibold text-text-primary">
          {feature.title || feature.feature_name || feature.feature_id}
        </p>
        <span
          data-feature-stage-badge
          className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: statusColor }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: statusColor }}
            aria-hidden="true"
          />
          {statusLabel}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Artifacts */}
        <SectionHeader label="Artifacts" />
        <ArtifactRow
          label="Product Spec"
          icon={<FileText className="h-3.5 w-3.5" />}
          active={activeDocTab === "product_spec"}
          onClick={() => onDocTabChange("product_spec")}
        />
        <ArtifactRow
          label="Technical Design"
          icon={<Code2 className="h-3.5 w-3.5" />}
          active={activeDocTab === "technical_design"}
          onClick={() => onDocTabChange("technical_design")}
        />
        <ArtifactRow
          label="Tasks"
          icon={<List className="h-3.5 w-3.5" />}
          active={activeDocTab === "tasks"}
          onClick={() => onDocTabChange("tasks")}
        />
        <ArtifactRow
          label="Logs"
          icon={<Hash className="h-3.5 w-3.5" />}
          active={activeDocTab === "logs"}
          onClick={() => onDocTabChange("logs")}
        />

        {/* Tasks */}
        <SectionHeader label="Tasks" />
        {tasks.length === 0 ? (
          <p className="px-3 py-2 text-[11px] text-text-muted">No tasks.</p>
        ) : (
          tasks.map((task) => <TaskRow key={task.id} task={task} />)
        )}

        {/* Sessions */}
        <div className="flex items-center justify-between px-3 pb-1 pt-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Sessions
          </span>
          <button
            type="button"
            onClick={onNewSession}
            aria-label="Start new agent session"
            title="New session"
            className="flex h-4 w-4 items-center justify-center text-text-muted transition-colors hover:text-text-primary"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
        {sessionsLoading ? (
          <p className="px-3 py-2 text-[11px] italic text-text-muted">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="px-3 py-2 text-[11px] text-text-muted">No sessions yet.</p>
        ) : (
          sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              active={selectedSessionId === s.id}
              onClick={() => onSessionSelect(s.id)}
            />
          ))
        )}

        {/* Channels — placeholder for T11 */}
        <SectionHeader label="Channels" />
        <div
          data-channels-placeholder
          className="px-3 py-2 text-[11px] text-text-muted"
        >
          Channels coming soon.
        </div>
      </div>
    </div>
  );
}
