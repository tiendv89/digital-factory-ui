"use client";

import { LayoutGrid, List, Loader2, Plus, RefreshCcw, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { FEATURE_COLUMNS, lifecycleMeta, toFeatureRows } from "./board-meta";
import { FeatureCard } from "./feature-card";
import { FeatureListView } from "./feature-list-view";
import { useBoardContext } from "./kanban-board.context";
import { NewFeatureModal } from "./new-feature-modal";
import { LifecycleGlyph, StatusGlyph } from "./status-glyph";

type KanbanFilter = { id: string; stage: string };
type ListFilter = { id: string; label: string; taskStatuses: string[]; color: string };

const KANBAN_FILTERS: KanbanFilter[] = [
  { id: "ready_for_implementation", stage: "ready_for_implementation" },
  { id: "in_implementation", stage: "in_implementation" },
  { id: "in_handoff", stage: "in_handoff" },
];

const LIST_FILTERS: ListFilter[] = [
  { id: "ready", label: "Ready", taskStatuses: ["ready", "todo"], color: "#8d8f95" },
  { id: "in_progress", label: "In Progress", taskStatuses: ["in_progress"], color: "#58b0ff" },
  { id: "blocked", label: "Blocked", taskStatuses: ["blocked"], color: "#f14d4c" },
];

export function BoardView() {
  const { features, openFeatureTab, featureSearchQuery, setFeatureSearchQuery, viewMode, setViewMode, workspaceDetail, reload, syncing, syncBoard } = useBoardContext();

  const [showNewFeature, setShowNewFeature] = useState(false);
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  // Reflect a backend-in-flight sync (webhook- or other-client-triggered), not
  // just the local button click, and poll until it finishes so progress is
  // visible without a manual refresh.
  const backendSyncing = workspaceDetail.source_state?.status === "syncing";
  const isSyncing = syncing || backendSyncing;
  useEffect(() => {
    if (!backendSyncing) return;
    const id = setInterval(() => void reload(), 4000);
    return () => clearInterval(id);
  }, [backendSyncing, reload]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const search = featureSearchQuery.trim().toLowerCase();
  const isList = viewMode === "list";

  const handleSetViewMode = (mode: "kanban" | "list") => {
    setViewMode(mode);
    setQuickFilters(new Set());
  };

  const toggleQuickFilter = (id: string) =>
    setQuickFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const activeKanbanStages = useMemo(() => new Set(KANBAN_FILTERS.filter((f) => quickFilters.has(f.id)).map((f) => f.stage)), [quickFilters]);

  const activeListTaskStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const f of LIST_FILTERS) {
      if (quickFilters.has(f.id)) f.taskStatuses.forEach((s) => set.add(s));
    }
    return set;
  }, [quickFilters]);

  const visibleFeatures = useMemo(() => {
    let result = features;
    if (search) {
      result = result.filter(
        (f) =>
          (f.title ?? "").toLowerCase().includes(search) || f.id.toLowerCase().includes(search) || f.tasks.some((t) => t.title.toLowerCase().includes(search) || t.id.toLowerCase().includes(search)),
      );
    }
    if (!isList && activeKanbanStages.size > 0) {
      result = result.filter((f) => activeKanbanStages.has(f.featureStatus));
    }
    if (isList && activeListTaskStatuses.size > 0) {
      result = result.filter((f) => f.tasks.some((t) => activeListTaskStatuses.has(t.status)));
    }
    return result;
  }, [features, search, isList, activeKanbanStages, activeListTaskStatuses]);

  const featureRows = useMemo(() => toFeatureRows(visibleFeatures), [visibleFeatures]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-bg">
      {/* Toolbar */}
      <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border px-6">
        <h1 className="mr-1 text-[15px] font-semibold text-text-primary">Features</h1>

        {/* Search */}
        <label className="flex h-[30px] w-[220px] items-center gap-2 rounded-md border border-border bg-surface px-3 text-text-secondary focus-within:border-primary">
          <Search className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="sr-only">Search features</span>
          <input
            ref={searchRef}
            value={featureSearchQuery}
            onChange={(e) => setFeatureSearchQuery(e.target.value)}
            placeholder="Search features…"
            className="min-w-0 flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
          />
          {featureSearchQuery && (
            <button type="button" onClick={() => setFeatureSearchQuery("")} aria-label="Clear search" className="shrink-0 text-text-muted hover:text-text-primary">
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </label>

        {/* Quick filters — lifecycle stages in kanban, task statuses in list */}
        <div className="flex items-center gap-2">
          {isList
            ? LIST_FILTERS.map((qf) => {
                const active = quickFilters.has(qf.id);
                return (
                  <button
                    key={qf.id}
                    type="button"
                    onClick={() => toggleQuickFilter(qf.id)}
                    aria-pressed={active}
                    className={
                      "flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors " + (active ? "" : "border-border text-text-secondary hover:bg-surface-subtle")
                    }
                    style={active ? { borderColor: qf.color, backgroundColor: `${qf.color}18`, color: qf.color } : undefined}
                  >
                    <StatusGlyph status={qf.taskStatuses[0]!} size={11} />
                    {qf.label}
                  </button>
                );
              })
            : KANBAN_FILTERS.map((qf) => {
                const meta = lifecycleMeta(qf.stage);
                const active = quickFilters.has(qf.id);
                return (
                  <button
                    key={qf.id}
                    type="button"
                    onClick={() => toggleQuickFilter(qf.id)}
                    aria-pressed={active}
                    className={
                      "flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors " + (active ? "" : "border-border text-text-secondary hover:bg-surface-subtle")
                    }
                    style={active ? { borderColor: meta.color, backgroundColor: meta.bg, color: meta.color } : undefined}
                  >
                    <LifecycleGlyph stage={qf.stage} size={11} />
                    {meta.label}
                  </button>
                );
              })}
        </div>

        <div className="flex-1" />

        {/* Sync */}
        <button
          type="button"
          onClick={syncBoard}
          disabled={isSyncing}
          aria-label="Sync workspace"
          title={
            isSyncing
              ? "Syncing…"
              : workspaceDetail.source_state?.last_synced_at
                ? `Last synced ${new Date(workspaceDetail.source_state.last_synced_at).toLocaleString()}`
                : "Sync workspace"
          }
          className="flex h-[30px] items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary disabled:opacity-50"
        >
          {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          {backendSyncing && <span>Syncing…</span>}
        </button>

        {/* New Feature */}
        <button
          type="button"
          onClick={() => setShowNewFeature(true)}
          data-new-feature-btn
          className="flex h-[30px] items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New Feature
        </button>

        {/* View toggle */}
        <div className="flex overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => handleSetViewMode("kanban")}
            aria-pressed={!isList}
            aria-label="Board view"
            className="flex h-7 w-[30px] items-center justify-center"
            style={{
              backgroundColor: !isList ? "#2d2d2d" : "#252526",
              color: !isList ? "#007acc" : "#858585",
            }}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode("list")}
            aria-pressed={isList}
            aria-label="List view"
            className="flex h-7 w-[30px] items-center justify-center"
            style={{
              backgroundColor: isList ? "#2d2d2d" : "#252526",
              color: isList ? "#007acc" : "#858585",
            }}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Body */}
      {isList ? (
        <FeatureListView
          rows={featureRows}
          onFeatureClick={(feature) => openFeatureTab(feature)}
          onTaskClick={(task) => {
            const parent =
              (task.featureBackendId != null && visibleFeatures.find((f) => f.backendId === task.featureBackendId)) ||
              visibleFeatures.find((f) => f.tasks.some((t) => (t.backendId ?? t.id) === (task.backendId ?? task.id)));
            if (parent) openFeatureTab(parent);
          }}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full gap-2 px-4">
            {FEATURE_COLUMNS.map((col) => {
              const colFeatures = visibleFeatures.filter((f) => f.featureStatus === col.id);
              return (
                <div key={col.id} className="flex min-w-0 flex-1 flex-col pt-4">
                  {/* Column header */}
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <LifecycleGlyph stage={col.id} size={12} />
                    <span className="truncate text-[11px] font-semibold tracking-wide" style={{ color: "#858585" }}>
                      {col.label}
                    </span>
                    <span
                      className="flex items-center justify-center rounded-full"
                      style={{
                        minWidth: 18,
                        height: 18,
                        padding: "0 5px",
                        backgroundColor: "#2d2d2d",
                        color: "#858585",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {colFeatures.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto pr-1">
                    {colFeatures.map((f) => (
                      <FeatureCard key={f.id} feature={f} onClick={() => openFeatureTab(f)} />
                    ))}
                    {colFeatures.length === 0 && (
                      <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed text-[11px]" style={{ borderColor: "#333333", color: "#6e6e6e" }}>
                        No features
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showNewFeature && (
        <NewFeatureModal
          workspaceId={workspaceDetail.id}
          onClose={() => setShowNewFeature(false)}
          onSuccess={() => {
            setShowNewFeature(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
