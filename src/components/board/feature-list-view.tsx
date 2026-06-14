"use client";

import { ChevronDown, ChevronRight, LayoutList } from "lucide-react";
import { useMemo } from "react";

import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import { useBoardStore } from "@/stores/board";

import { BoardAvatar } from "./board-avatar";
import { type BoardFeatureRow, deriveBoardAssignee, lifecycleMeta } from "./board-meta";
import { LifecycleGlyph, StatusBadge, StatusGlyph } from "./status-glyph";

const GRID = "2fr 1fr 120px 80px";
const DONE_LIKE = new Set(["done", "cancelled", "review_passed"]);

// Display order for feature lifecycle groups — active → terminal
const STATUS_ORDER = ["blocked", "in_handoff", "in_implementation", "ready_for_implementation", "in_tdd", "in_design", "done", "cancelled"];

function statusSortIndex(status: string) {
  const i = STATUS_ORDER.indexOf(status);
  return i === -1 ? STATUS_ORDER.length - 2 : i;
}

export function FeatureListView({ rows, onTaskClick, onFeatureClick }: { rows: BoardFeatureRow[]; onTaskClick: (task: ParsedTask) => void; onFeatureClick: (feature: ParsedFeature) => void }) {
  const { collapsedFeatures, collapsedGroups, toggleFeatureCollapsed, toggleGroupCollapsed } = useBoardStore();

  const groups = useMemo(() => {
    const map = new Map<string, BoardFeatureRow[]>();
    for (const row of rows) {
      const status = row.feature.featureStatus ?? "in_design";
      if (!map.has(status)) map.set(status, []);
      map.get(status)!.push(row);
    }
    return [...map.entries()].sort(([a], [b]) => statusSortIndex(a) - statusSortIndex(b)).map(([status, groupRows]) => ({ status, rows: groupRows }));
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface">
          <LayoutList className="h-5 w-5 text-text-muted" />
        </div>
        <p className="text-[13px] font-medium text-text-secondary">No features found</p>
        <p className="text-[11px] text-text-muted">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {/* Column headers */}
      <div className="grid items-center border-b border-border px-2 pb-2" style={{ gridTemplateColumns: GRID }}>
        {["Feature", "Stage", "Progress", "Assignees"].map((h) => (
          <span key={h} className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#6e6e6e" }}>
            {h}
          </span>
        ))}
      </div>

      {groups.map(({ status, rows: groupRows }) => {
        const meta = lifecycleMeta(status);
        const groupCollapsed = collapsedGroups.includes(status);

        return (
          <div key={status}>
            {/* Group header */}
            <button type="button" onClick={() => toggleGroupCollapsed(status)} className="mt-4 flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors hover:bg-white/4">
              {groupCollapsed ? <ChevronRight className="h-3 w-3 shrink-0 text-text-muted" /> : <ChevronDown className="h-3 w-3 shrink-0 text-text-muted" />}
              <span className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>
                {meta.label}
              </span>
              <span className="text-[10px] text-text-muted">
                {groupRows.length} {groupRows.length === 1 ? "feature" : "features"}
              </span>
            </button>

            {!groupCollapsed &&
              groupRows.map(({ feature, color, pct }) => {
                const featureCollapsed = collapsedFeatures.includes(feature.id);
                const assignees = Array.from(
                  new Map(
                    feature.tasks
                      .map((t) => deriveBoardAssignee(t))
                      .filter((a): a is NonNullable<typeof a> => a !== null)
                      .map((a) => [a.name, a]),
                  ).values(),
                ).slice(0, 4);

                return (
                  <div key={feature.id} className="mt-1">
                    {/* Feature row */}
                    <div className="grid min-h-11 items-center rounded-lg px-2 py-2 transition-colors hover:bg-white/4" style={{ gridTemplateColumns: GRID }}>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleFeatureCollapsed(feature.id)}
                          aria-label={featureCollapsed ? "Expand tasks" : "Collapse tasks"}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-muted transition-colors hover:bg-white/8 hover:text-text-primary"
                        >
                          {featureCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        <LifecycleGlyph stage={feature.featureStatus} size={12} />
                        <button
                          type="button"
                          onClick={() => onFeatureClick(feature)}
                          className="flex min-w-0 flex-col rounded text-left transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          title="Open feature"
                        >
                          <span className="truncate text-[13px] font-semibold text-text-primary">{feature.id}</span>
                        </button>
                      </div>

                      <span className="inline-flex h-5 w-fit items-center rounded-full px-2 text-[10px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>

                      <div className="flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "#3c3c3c" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "oklch(0.68 0.15 150)" : color }} />
                        </div>
                        <span className="w-7 text-right text-[10px]" style={{ color: "#6e6e6e" }}>
                          {pct}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {assignees.map((a) => (
                          <BoardAvatar key={a.name} name={a.name} type={a.type} size="sm" />
                        ))}
                      </div>
                    </div>

                    {/* Task sub-rows */}
                    {!featureCollapsed &&
                      feature.tasks.map((task) => {
                        const done = DONE_LIKE.has(task.status);
                        const assignee = deriveBoardAssignee(task);
                        return (
                          <div
                            key={task.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onTaskClick(task)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onTaskClick(task);
                              }
                            }}
                            className="grid h-8.5 cursor-pointer items-center rounded px-2 transition-colors hover:bg-white/3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ gridTemplateColumns: GRID, borderLeft: `2px solid ${color}33`, marginLeft: 28, paddingLeft: 12 }}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <StatusGlyph status={task.status} size={11} />
                              <span className={`truncate text-[12px] ${done ? "text-text-muted" : "text-text-primary"}`}>{task.title}</span>
                            </div>
                            <span className="font-mono text-[10px]" style={{ color: "#6e6e6e" }}>
                              {task.id}
                            </span>
                            <StatusBadge status={task.status} />
                            <div className="flex items-center">{assignee && <BoardAvatar name={assignee.name} type={assignee.type} size="sm" working={assignee.working} />}</div>
                          </div>
                        );
                      })}

                    <div className="h-1" />
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
