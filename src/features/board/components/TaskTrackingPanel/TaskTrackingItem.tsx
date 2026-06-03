"use client";

import { getNextAction } from "@/features/board/lib/status";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { createSingleDoubleClickController } from "@/lib/click-intent";
import { computeStatusAge, getTaskLastUpdatedAt } from "@/lib/time";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import { ArrowRight, Bot, Layers } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type TaskTrackingItemProps = {
  task: ParsedTask;
  feature: ParsedFeature;
  onSelect: (task: ParsedTask, feature: ParsedFeature) => void;
  onOpenTab?: (task: ParsedTask) => void;
  onOpenNewTab?: (task: ParsedTask) => void;
};

const ACTOR_TYPE_LABEL: Record<string, string> = {
  agent: "Agent",
  human: "Human",
  either: "Agent or Human",
};

export function TaskTrackingItem({
  task,
  feature,
  onSelect,
  onOpenTab,
  onOpenNewTab,
}: TaskTrackingItemProps) {
  const actorLabel = task.execution?.actor_type
    ? (ACTOR_TYPE_LABEL[task.execution.actor_type] ?? task.execution.actor_type)
    : null;

  const statusAge = computeStatusAge(task);

  const lastUpdatedAt = getTaskLastUpdatedAt(task);
  const lastUpdatedLabel = useRelativeTime(lastUpdatedAt);

  const priorityLabel = task.priority?.trim()
    ? task.priority.trim().toUpperCase()
    : null;

  const nextInfo = task.description?.trim()
    ? task.description
    : task.blockedReason
      ? task.blockedReason
      : getNextAction(task.status);

  const clickController = useMemo(
    () =>
      createSingleDoubleClickController({
        onSingleClick: () => onSelect(task, feature),
        onDoubleClick: () => {
          if (onOpenTab) {
            onOpenTab(task);
          }
        },
      }),
    [feature, onOpenTab, onSelect, task],
  );

  useEffect(() => clickController.clearPendingClick, [clickController]);

  const [menuPosition, setMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuOpen = Boolean(menuPosition);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuPosition(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuPosition(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function handleDoubleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    clickController.handleDoubleClick();
  }

  function handleContextMenu(e: React.MouseEvent) {
    if (!onOpenNewTab) return;
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
  }

  function handleNewTab(e: React.MouseEvent) {
    e.stopPropagation();
    if (onOpenNewTab) {
      onOpenNewTab(task);
    }
    setMenuPosition(null);
  }

  return (
    <button
      type="button"
      onClick={clickController.handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      className="group flex w-full flex-col gap-2 border border-border bg-surface px-3 py-3 text-left transition-colors hover:border-primary-light hover:bg-surface-subtle focus:outline-none focus-visible:border-primary focus-visible:bg-primary-light/30"
    >
      <div className="flex min-w-0 items-start gap-2">
        <span
          aria-label={`Task ${task.id}`}
          className="shrink-0 border border-primary-light bg-primary-light px-2 py-0.5 font-mono text-[13px] font-bold leading-5 text-primary"
        >
          {task.id}
        </span>
        <p className="line-clamp-5 min-w-0 break-words text-sm font-semibold leading-snug text-text-primary">
          {task.title || "Untitled task"}
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs leading-5 text-text-secondary">
        <span className="flex max-w-full items-center gap-1 bg-chip-bg px-1.5">
          <Layers className="h-3 w-3 shrink-0 text-text-secondary" />
          <span className="truncate">{feature.title || feature.id}</span>
        </span>
        {statusAge !== "—" && (
          <span
            aria-label={`Status age: ${statusAge}`}
            className="border border-border bg-surface px-1.5 font-mono font-bold text-text-primary"
          >
            {statusAge}
          </span>
        )}
        {priorityLabel && (
          <span className="bg-chip-bg px-1.5 font-mono text-text-secondary">
            {priorityLabel}
          </span>
        )}
        {actorLabel && (
          <span className="flex items-center gap-1 bg-chip-bg px-1.5">
            <Bot className="h-3 w-3 shrink-0 text-ready" />
            {actorLabel}
          </span>
        )}
      </div>
      {nextInfo && (
        <p className="flex min-w-0 items-center gap-1 text-xs leading-5 text-text-muted">
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-success" />
          <span className="truncate">{nextInfo}</span>
        </p>
      )}
      {lastUpdatedLabel && (
        <div className="flex justify-end">
          <span
            aria-label={`Last updated: ${lastUpdatedLabel}`}
            className=" px-2 py-0.5 font-sans text-[10px] font-medium leading-4 text-text-primary"
          >
            {lastUpdatedLabel}
          </span>
        </div>
      )}

      {menuOpen && menuPosition && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 w-32 border border-border bg-surface p-1 shadow-lg"
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleNewTab}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-text-primary transition-colors hover:bg-surface-subtle"
          >
            New tab
          </button>
        </div>
      )}
    </button>
  );
}
