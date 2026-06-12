"use client";

import { Modal } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Bot, Check, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronsDown, FileText, Filter, Lock, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AgentChatPanel } from "@/components/agent-chat";
import { BoardAvatar } from "@/components/board/board-avatar";
import { FEATURE_LIFECYCLE_META, lifecycleMeta } from "@/components/board/board-meta";
import { LifecycleGlyph, StatusGlyph } from "@/components/board/status-glyph";
import { type DocTab, FeatureIDEDocsPanel } from "@/components/features/feature-ide-docs-panel";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { workspaceKeys } from "@/constants/query-keys";
import { useActivity } from "@/hooks/board/use-activity";
import { useFeatureDetail } from "@/hooks/board/use-feature-detail";
import type { ChatSessionSummary } from "@/services/hermes-agent/chat";
import { listChatSessions } from "@/services/hermes-agent/chat";
import { useBoardStore } from "@/stores/board";
import { FEATURE_MODE_STATUSES } from "@/utils/board/status";
import { formatTimestamp } from "@/utils/time";

function extractMilestone(name: string): string | null {
  const m = name.match(/^m(\d+)/i);
  return m ? `M${m[1]}` : null;
}

// ── Feature Selector Preview ────────────────────────────────────────────────

function FeaturePreviewPanel({ workspaceId, featureId }: { workspaceId: string; featureId: string }) {
  const { feature, loading } = useFeatureDetail(workspaceId, featureId);
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-xs text-text-muted">Loading…</span>
      </div>
    );
  }
  if (!feature) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-xs text-text-muted">No feature selected</span>
      </div>
    );
  }
  const lc = lifecycleMeta(feature.status);
  const milestone = extractMilestone(feature.feature_name);
  const done = feature.task_counts?.done ?? 0;
  const total = feature.task_counts?.total ?? 0;
  const inProgress = feature.task_counts?.in_progress ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
      <div className="mb-4 flex items-center gap-2">
        {milestone && (
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "#3a3a3a", color: "#aaa" }}>
            {milestone}
          </span>
        )}
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide" style={{ backgroundColor: lc.bg, color: lc.color }}>
          {lc.label}
        </span>
      </div>
      {feature.title && <p className="mb-5 text-[13px] leading-relaxed text-text-secondary">{feature.title}</p>}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { value: total, label: "Total tasks" },
          { value: done, label: "Completed" },
          { value: inProgress, label: "In progress" },
        ].map(({ value, label }) => (
          <div key={label} className="rounded-lg border border-border p-3">
            <div className="text-xl font-bold text-text-primary">{value}</div>
            <div className="text-[11px] text-text-muted">{label}</div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Progress</span>
            <span className="text-[11px] text-text-muted">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: "#007acc" }} />
          </div>
        </div>
      )}
      {feature.tasks && feature.tasks.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Tasks</div>
          <div className="flex flex-col gap-1.5">
            {feature.tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
                <StatusGlyph status={task.status} size={13} />
                <span className="min-w-0 flex-1 text-[12px] leading-snug text-text-secondary">{task.title || task.task_name}</span>
                <span className="shrink-0 text-[10px] text-text-muted">{task.task_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ARTIFACTS: { label: string; tab: DocTab | null }[] = [
  { label: "Product Spec", tab: "product_spec" },
  { label: "Technical Design", tab: "technical_design" },
  { label: "Handoffs", tab: null },
];

type ActiveSession = { id: string; name: string };

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({
  children,
  collapsed,
  onToggle,
  onAdd,
  icon: Icon,
}: {
  children: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  onAdd?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-1 px-3 pb-1 pt-4">
      {onToggle && (
        <button type="button" onClick={onToggle} className="cursor-pointer flex h-[14px] w-[14px] shrink-0 items-center justify-center text-text-muted transition-colors hover:text-text-secondary">
          {collapsed ? <ChevronRight className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
        </button>
      )}
      {Icon && <Icon className="h-3 w-3 shrink-0 text-text-muted" />}
      <button
        type="button"
        onClick={onToggle}
        className="cursor-pointer flex-1 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text-secondary disabled:pointer-events-none"
        disabled={!onToggle}
      >
        {children}
      </button>
      {onAdd && (
        <button type="button" onClick={onAdd} title="New" className="cursor-pointer flex h-[18px] w-[18px] items-center justify-center rounded text-text-muted transition-colors hover:bg-white/10">
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
        <button
          type="button"
          onClick={onClose}
          aria-label="Close session"
          className="cursor-pointer flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-white/10 hover:text-text-primary"
        >
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
  const { openTaskTab, activeFeatureTabId, activeWorkspace } = useWorkspaceContext();
  const { feature, loading, error } = useFeatureDetail(workspaceId, featureId);
  const { events } = useActivity(workspaceId);

  const { collapsedWorkbenchSections, toggleWorkbenchSection } = useBoardStore();
  const [activeTab, setActiveTab] = useState<DocTab>("product_spec");
  const [activeChannel, setActiveChannel] = useState<ActiveSession | null>({ id: "", name: "New session" });
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState("");
  const [selectorStatus, setSelectorStatus] = useState<string | null>(null);
  const [previewFeatureId, setPreviewFeatureId] = useState<string>(featureId);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
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
      <div className="flex h-full flex-col overflow-hidden bg-bg">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="flex w-65 shrink-0 flex-col gap-2 border-r border-border px-3 py-4" style={{ backgroundColor: "#252526" }}>
            {[70, 50, 80, 45, 65, 55].map((w, i) => (
              <div key={i} className="animate-pulse rounded bg-surface-secondary h-3" style={{ width: `${w}%` }} />
            ))}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-6">
            <div className="animate-pulse rounded bg-surface-secondary h-6 w-1/2" />
            <div className="animate-pulse rounded bg-surface-secondary h-3 w-1/4" />
            <div className="mt-2 flex flex-col gap-2">
              {[100, 90, 75, 100, 60].map((w, i) => (
                <div key={i} className="animate-pulse rounded bg-surface-secondary h-3" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error || !feature) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 bg-bg">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-danger/20 bg-danger/10">
          <AlertCircle className="h-5 w-5 text-danger" />
        </div>
        <p className="text-[13px] font-medium text-text-secondary">Failed to load feature</p>
        <p className="max-w-sm text-center text-[11px] text-text-muted">{error?.message ?? "The feature could not be found."}</p>
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
          <div className="flex-1 overflow-y-auto">
            {/* Feature header */}
            <div className="border-b border-border px-3 py-3">
              <div className="mb-1.5 flex items-center gap-2">
                <button type="button" onClick={() => router.push("/board")} aria-label="Back to board" className="cursor-pointer shrink-0 text-text-muted transition-colors hover:text-text-primary">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewFeatureId(featureId);
                    setSelectorOpen(true);
                  }}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-white/5"
                >
                  <span className="truncate text-[13px] font-semibold text-text-primary">{feature.feature_name || feature.title}</span>
                  <ChevronDown className="h-3 w-3 shrink-0 text-text-muted" />
                </button>

                <Modal.Root
                  isOpen={selectorOpen}
                  onOpenChange={(o) => {
                    setSelectorOpen(o);
                    if (!o) {
                      setSelectorSearch("");
                      setSelectorStatus(null);
                    }
                  }}
                >
                  <Modal.Backdrop variant="opaque" isDismissable>
                    <Modal.Container placement="center">
                      <Modal.Dialog className="p-0 flex max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-[13px] border border-border bg-surface shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
                        <div className="flex min-h-0 flex-1">
                          {/* ── Left: feature list ────────────────────── */}
                          <div className="flex w-80 shrink-0 flex-col border-r border-border">
                            {/* Search */}
                            <div className="border-b border-border px-3 py-3">
                              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary px-2.5 py-2">
                                <Filter className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Find feature…"
                                  value={selectorSearch}
                                  onChange={(e) => setSelectorSearch(e.target.value)}
                                  className="min-w-0 flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none"
                                />
                                {selectorSearch && (
                                  <button type="button" onClick={() => setSelectorSearch("")} className="cursor-pointer shrink-0 text-text-muted hover:text-text-primary">
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Status filter chips */}
                            {(() => {
                              const PINNED_STATUSES = ["ready_for_implementation", "in_implementation", "in_handoff"];
                              return (
                                <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2.5">
                                  {PINNED_STATUSES.map((s) => {
                                    const m = FEATURE_LIFECYCLE_META[s] ?? FEATURE_LIFECYCLE_META.in_design;
                                    const active = selectorStatus === s;
                                    return (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => setSelectorStatus(active ? null : s)}
                                        className="cursor-pointer flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all"
                                        style={{
                                          backgroundColor: active ? m.bg : "var(--color-surface-secondary)",
                                          color: m.color,
                                          borderColor: active ? m.color : "var(--color-border-control)",
                                          opacity: selectorStatus && !active ? 0.45 : 1,
                                        }}
                                      >
                                        <LifecycleGlyph stage={s} size={12} />
                                        {m.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })()}

                            {/* List */}
                            <div className="flex-1 overflow-y-auto py-1">
                              {(() => {
                                const q = selectorSearch.toLowerCase();
                                const all = activeWorkspace?.features ?? [];
                                const visible = all.filter(
                                  (f) => (!q || f.feature_name.toLowerCase().includes(q) || f.title.toLowerCase().includes(q)) && (!selectorStatus || f.status === selectorStatus),
                                );
                                if (visible.length === 0) {
                                  return <p className="px-4 py-6 text-center text-[11px] text-text-muted">No features match</p>;
                                }

                                const renderFeatureRow = (f: (typeof visible)[0]) => {
                                  const isCurrent = f.id === featureId;
                                  const isPreview = f.id === previewFeatureId;
                                  return (
                                    <button
                                      key={f.id}
                                      type="button"
                                      onClick={() => setPreviewFeatureId(f.id)}
                                      className="cursor-pointer flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/8"
                                      style={{
                                        borderLeft: isPreview ? "2px solid #007acc" : "2px solid transparent",
                                        ...(isPreview && { backgroundColor: "oklch(1 0 0 / 0.04)" }),
                                      }}
                                    >
                                      <LifecycleGlyph stage={f.status} size={15} />
                                      <span className="min-w-0 flex-1 truncate text-[14px] text-text-primary">{f.feature_name}</span>
                                      {isCurrent && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                                    </button>
                                  );
                                };

                                // When a status filter is active, render flat list (no group header needed)
                                if (selectorStatus) {
                                  return visible.map(renderFeatureRow);
                                }

                                // Group by status in canonical order
                                const byStatus = new Map<string, typeof visible>();
                                for (const f of visible) {
                                  const bucket = byStatus.get(f.status) ?? [];
                                  bucket.push(f);
                                  byStatus.set(f.status, bucket);
                                }
                                const orderedStatuses = [
                                  ...FEATURE_MODE_STATUSES.filter((s) => byStatus.has(s)),
                                  ...Array.from(byStatus.keys()).filter((s) => !FEATURE_MODE_STATUSES.includes(s as never)),
                                ];

                                return orderedStatuses.map((status) => {
                                  const group = byStatus.get(status)!;
                                  const m = FEATURE_LIFECYCLE_META[status] ?? FEATURE_LIFECYCLE_META.in_design;
                                  const collapsed = collapsedGroups.has(status);
                                  const toggleGroup = () =>
                                    setCollapsedGroups((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(status)) next.delete(status);
                                      else next.add(status);
                                      return next;
                                    });
                                  return (
                                    <div key={status}>
                                      <button type="button" onClick={toggleGroup} className="cursor-pointer flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5">
                                        <ChevronRight
                                          className="h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-150"
                                          style={{ transform: collapsed ? "rotate(0deg)" : "rotate(90deg)" }}
                                        />
                                        <span className="rounded-full px-2.5 py-0.5 text-[12px] font-medium" style={{ backgroundColor: m.bg, color: m.color }}>
                                          {m.label}
                                        </span>
                                        <span className="text-[12px] text-text-muted">
                                          {group.length} {group.length === 1 ? "feature" : "features"}
                                        </span>
                                      </button>
                                      {!collapsed && group.map(renderFeatureRow)}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>

                          {/* ── Right: preview ────────────────────────── */}
                          <div className="flex min-w-0 flex-1 flex-col">
                            {/* Header */}
                            <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-5 py-3.5">
                              <LifecycleGlyph stage={(activeWorkspace?.features ?? []).find((f) => f.id === previewFeatureId)?.status ?? ""} size={15} />
                              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text-primary">
                                {(activeWorkspace?.features ?? []).find((f) => f.id === previewFeatureId)?.feature_name ?? ""}
                              </span>
                              <button type="button" onClick={() => setSelectorOpen(false)} aria-label="Close" className="cursor-pointer shrink-0 text-text-muted hover:text-text-primary">
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Feature detail */}
                            <FeaturePreviewPanel workspaceId={workspaceId} featureId={previewFeatureId} />

                            {/* Footer */}
                            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">
                              <button
                                type="button"
                                onClick={() => setSelectorOpen(false)}
                                className="cursor-pointer rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (previewFeatureId !== featureId) {
                                    router.push(`/feature/${encodeURIComponent(previewFeatureId)}`);
                                  }
                                  setSelectorOpen(false);
                                }}
                                className="cursor-pointer rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: "#007acc" }}
                              >
                                {previewFeatureId === featureId ? "Current feature" : "Open feature"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </Modal.Dialog>
                    </Modal.Container>
                  </Modal.Backdrop>
                </Modal.Root>
              </div>
              <span className="inline-flex h-4.5 items-center gap-1 rounded-full px-2 text-[10px] font-semibold" style={{ backgroundColor: lc.bg, color: lc.color }}>
                {lc.label}
              </span>
            </div>

            {/* Artifacts */}
            <SectionLabel collapsed={artifactsCollapsed} onToggle={() => toggleWorkbenchSection("artifacts")} icon={FileText}>
              Artifacts
            </SectionLabel>
            {!artifactsCollapsed &&
              ARTIFACTS.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => a.tab && setActiveTab(a.tab)}
                  className="cursor-pointer flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-white/5"
                  style={{ color: a.tab && activeTab === a.tab ? "#d4d4d4" : "#cccccc" }}
                >
                  <span className="text-[12px] text-text-muted">›</span>
                  {a.label}
                </button>
              ))}

            {/* Tasks */}
            <SectionLabel collapsed={tasksCollapsed} onToggle={() => toggleWorkbenchSection("tasks")} icon={CheckSquare}>
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
                    className="cursor-pointer flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/5"
                  >
                    <StatusGlyph status={task.status} size={13} />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-text-secondary">{task.title || task.task_name}</span>
                    <span className="shrink-0 text-[10px] text-text-muted">{task.task_name}</span>
                  </button>
                ))
              ))}

            {/* Sessions */}
            <SectionLabel collapsed={sessionsCollapsed} onToggle={() => toggleWorkbenchSection("sessions")} onAdd={() => setActiveChannel({ id: "", name: "New session" })} icon={Bot}>
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
                      className="cursor-pointer flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/5"
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
        <button
          type="button"
          onClick={() => setDockCollapsed(false)}
          className="cursor-pointer flex h-8 shrink-0 items-center gap-3 border-t border-border px-4 text-left"
          style={{ backgroundColor: "#252526" }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Activity</span>
          <ChevronsDown className="h-3 w-3 text-text-muted" />
        </button>
      ) : (
        <div className="flex h-50 shrink-0 flex-col border-t border-border" style={{ backgroundColor: "#252526" }}>
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-4">
            <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Activity</span>
            <button type="button" className="cursor-pointer flex h-5.5 items-center gap-1 rounded border border-border px-2 text-[11px] text-text-muted">
              <Filter className="h-2.5 w-2.5" /> Filter
            </button>
            <button type="button" onClick={() => setDockCollapsed(true)} className="cursor-pointer ml-1 text-text-muted hover:text-text-primary" aria-label="Collapse activity">
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
