"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsDown, Filter, Lock, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AgentChatPanel } from "@/components/agent-chat";
import { BoardAvatar } from "@/components/board/board-avatar";
import { lifecycleMeta } from "@/components/board/board-meta";
import { StatusGlyph } from "@/components/board/status-glyph";
import { type DocTab, FeatureIDEDocsPanel } from "@/components/features/feature-ide-docs-panel";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { workspaceKeys } from "@/constants/query-keys";
import { useActivity } from "@/hooks/board/use-activity";
import { useFeatureDetail } from "@/hooks/board/use-feature-detail";
import type { ChatSessionSummary } from "@/services/workflow-backend/chat";
import { listChatSessions } from "@/services/workflow-backend/chat";
import { useBoardStore } from "@/stores/board";
import { formatTimestamp } from "@/utils/time";

const ARTIFACTS: { label: string; tab: DocTab | null }[] = [
  { label: "Product Spec", tab: "product_spec" },
  { label: "Technical Design", tab: "technical_design" },
  { label: "Handoffs", tab: null },
];

type ActiveSession = { id: string; name: string };

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children, collapsed, onToggle, onAdd }: { children: React.ReactNode; collapsed?: boolean; onToggle?: () => void; onAdd?: () => void }) {
  return (
    <div className="flex items-center gap-1 px-3 pb-1 pt-4">
      {onToggle && (
        <button type="button" onClick={onToggle} className="flex h-[14px] w-[14px] shrink-0 items-center justify-center text-text-muted transition-colors hover:text-text-secondary">
          {collapsed ? <ChevronRight className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
        </button>
      )}
      <button
        type="button"
        onClick={onToggle}
        className="flex-1 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text-secondary disabled:pointer-events-none"
        disabled={!onToggle}
      >
        {children}
      </button>
      {onAdd && (
        <button type="button" onClick={onAdd} title="New" className="flex h-[18px] w-[18px] items-center justify-center rounded text-text-muted transition-colors hover:bg-white/10">
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Session chat header wrapper around the real AgentChatPanel ──────────────────

function SessionChat({
  workspaceId,
  featureId,
  sessionId,
  name,
  onClose,
  onArtifactSaved,
}: {
  workspaceId: string;
  featureId: string;
  sessionId: string | null;
  name: string;
  onClose: () => void;
  onArtifactSaved: (a: "product_spec" | "technical_design") => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-4" style={{ backgroundColor: "#252526" }}>
        <Lock className="h-3 w-3 shrink-0 text-text-muted" />
        <span className="flex-1 truncate text-xs font-semibold text-text-primary">{name}</span>
        <button type="button" onClick={onClose} aria-label="Close session" className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-white/10 hover:text-text-primary">
          <X className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="min-h-0 flex-1">
        <AgentChatPanel workspaceId={workspaceId} featureId={featureId} requestSessionId={sessionId} onArtifactSaved={onArtifactSaved} />
      </div>
    </div>
  );
}

// ── Main workbench ──────────────────────────────────────────────────────────────

export function FeatureWorkbench({ workspaceId, featureId }: { workspaceId: string; featureId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openTaskTab, activeFeatureTabId } = useWorkspaceContext();
  const { feature, loading, error } = useFeatureDetail(workspaceId, featureId);
  const { events } = useActivity(workspaceId);

  const { collapsedWorkbenchSections, toggleWorkbenchSection } = useBoardStore();
  const [activeTab, setActiveTab] = useState<DocTab>("product_spec");
  const [activeChannel, setActiveChannel] = useState<ActiveSession | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);

  const artifactsCollapsed = collapsedWorkbenchSections.includes("artifacts");
  const tasksCollapsed = collapsedWorkbenchSections.includes("tasks");
  const sessionsCollapsed = collapsedWorkbenchSections.includes("sessions");

  useEffect(() => {
    let cancelled = false;
    listChatSessions(workspaceId, featureId)
      .then((list) => {
        if (!cancelled) setSessions(list);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, featureId]);

  const handleArtifactSaved = useCallback(
    (_a: "product_spec" | "technical_design") => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.feature(workspaceId, featureId),
      });
    },
    [queryClient, workspaceId, featureId],
  );

  const handleOpenTaskTab = useCallback(
    (taskId: string, taskName: string, title: string) => {
      if (!feature) return;
      openTaskTab({
        taskId,
        taskName,
        title,
        featureId: feature.id,
        featureName: feature.feature_name,
        parentFeatureTabSessionId: activeFeatureTabId ?? undefined,
      });
    },
    [feature, openTaskTab, activeFeatureTabId],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-muted">Loading feature…</p>
      </div>
    );
  }
  if (error || !feature) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-danger">{error?.message ?? "Failed to load feature."}</p>
      </div>
    );
  }

  const featureEvents = events.filter((e) => e.feature_id === feature.id || e.feature_id === feature.feature_name);
  const lc = lifecycleMeta(feature.status);
  const tasks = feature.tasks ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Explorer ──────────────────────────────────────────── */}
        <aside className="flex w-65 shrink-0 flex-col overflow-hidden border-r border-border" style={{ backgroundColor: "#252526" }}>
          <div className="flex h-9 shrink-0 items-center border-b border-border px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Feature</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Feature header */}
            <div className="border-b border-border px-3 py-3">
              <div className="mb-1.5 flex items-center gap-2">
                <button type="button" onClick={() => router.push("/board")} aria-label="Back to board" className="shrink-0 text-text-muted transition-colors hover:text-text-primary">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="truncate text-[13px] font-semibold text-text-primary">{feature.feature_name || feature.title}</span>
              </div>
              <span className="inline-flex h-4.5 items-center gap-1 rounded-full px-2 text-[10px] font-semibold" style={{ backgroundColor: lc.bg, color: lc.color }}>
                {lc.label}
              </span>
            </div>

            {/* Artifacts */}
            <SectionLabel collapsed={artifactsCollapsed} onToggle={() => toggleWorkbenchSection("artifacts")}>
              Artifacts
            </SectionLabel>
            {!artifactsCollapsed &&
              ARTIFACTS.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => a.tab && setActiveTab(a.tab)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-white/5"
                  style={{ color: a.tab && activeTab === a.tab ? "#d4d4d4" : "#cccccc" }}
                >
                  <span className="text-[12px] text-text-muted">›</span>
                  {a.label}
                </button>
              ))}

            {/* Tasks */}
            <SectionLabel collapsed={tasksCollapsed} onToggle={() => toggleWorkbenchSection("tasks")}>
              Tasks
            </SectionLabel>
            {!tasksCollapsed &&
              (tasks.length === 0 ? (
                <p className="px-3 py-1.5 text-[11px] text-text-muted">No tasks.</p>
              ) : (
                tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleOpenTaskTab(task.id, task.task_name, task.title || task.task_name)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/5"
                  >
                    <StatusGlyph status={task.status} size={13} />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-text-secondary">{task.title || task.task_name}</span>
                    <span className="shrink-0 text-[10px] text-text-muted">{task.task_name}</span>
                  </button>
                ))
              ))}

            {/* Sessions */}
            <SectionLabel collapsed={sessionsCollapsed} onToggle={() => toggleWorkbenchSection("sessions")} onAdd={() => setActiveChannel({ id: "", name: "New session" })}>
              Sessions
            </SectionLabel>
            {!sessionsCollapsed &&
              (sessions.length === 0 ? (
                <p className="px-3 py-1.5 text-[11px] text-text-muted">No sessions yet.</p>
              ) : (
                sessions.map((s) => {
                  const active = activeChannel?.id === s.id;
                  const title = s.title || `Session ${s.id.slice(-6)}`;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveChannel(active ? null : { id: s.id, name: title })}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/5"
                      style={{
                        backgroundColor: active ? "#2d2d2d" : "transparent",
                        borderLeft: active ? "2px solid #007acc" : "2px solid transparent",
                      }}
                    >
                      <Lock className="h-2.75 w-2.75 shrink-0" style={{ color: active ? "#4fc3f7" : "#6e6e6e" }} />
                      <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: active ? "#d4d4d4" : "#858585" }}>
                        {title}
                      </span>
                    </button>
                  );
                })
              ))}

            <div className="h-3" />
          </div>
        </aside>

        {/* ── Center chat (when a channel/session is open) ─────────── */}
        {activeChannel && (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border">
            <SessionChat
              workspaceId={workspaceId}
              featureId={featureId}
              sessionId={activeChannel.id || null}
              name={activeChannel.name}
              onClose={() => setActiveChannel(null)}
              onArtifactSaved={handleArtifactSaved}
            />
          </div>
        )}

        {/* ── Docs (always on the right) ──────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <FeatureIDEDocsPanel feature={feature} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      {/* ── Activity dock ─────────────────────────────────────────── */}
      {dockCollapsed ? (
        <button type="button" onClick={() => setDockCollapsed(false)} className="flex h-8 shrink-0 items-center gap-3 border-t border-border px-4 text-left" style={{ backgroundColor: "#252526" }}>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Activity</span>
          <ChevronsDown className="h-3 w-3 text-text-muted" />
        </button>
      ) : (
        <div className="flex h-50 shrink-0 flex-col border-t border-border" style={{ backgroundColor: "#252526" }}>
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-4">
            <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Activity</span>
            <button type="button" className="flex h-5.5 items-center gap-1 rounded border border-border px-2 text-[11px] text-text-muted">
              <Filter className="h-2.5 w-2.5" /> Filter
            </button>
            <button type="button" onClick={() => setDockCollapsed(true)} className="ml-1 text-text-muted hover:text-text-primary" aria-label="Collapse activity">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {featureEvents.length === 0 ? (
              <p className="px-4 py-3 text-[11px] text-text-muted">No activity yet.</p>
            ) : (
              featureEvents.map((row, i) => (
                <div key={i} className="flex items-center gap-3 border-b px-4 py-1.5" style={{ borderColor: "rgba(51,51,51,0.5)" }}>
                  <span className="min-w-14 text-[10px] text-text-muted">{row.occurred_at ? formatTimestamp(row.occurred_at) : ""}</span>
                  <BoardAvatar name={row.actor || "system"} type={(row.actor || "").startsWith("agent") ? "agent" : "human"} size="sm" />
                  <span className="flex-1 text-[12px] text-text-secondary">{row.note ?? row.action ?? ""}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
