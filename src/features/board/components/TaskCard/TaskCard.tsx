"use client";

import { ArrowRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import type { ParsedTask } from "@/services/yaml-parser";
import { getNextAction } from "../../lib/status";

type TaskCardProps = {
  task: ParsedTask;
  featureId: string;
  featureTitle: string;
  onOpenTab?: (task: ParsedTask) => void;
  onOpenNewTab?: (task: ParsedTask) => void;
};

export function TaskCard({
  task,
  featureId,
  featureTitle,
  onOpenTab,
  onOpenNewTab,
}: TaskCardProps) {
  const nextAction = getNextAction(task.status);

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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenTab?.(task);
    }
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

  function handleClick() {
    onOpenTab?.(task);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      data-task-id={task.id}
      className="relative h-full min-h-19 cursor-pointer border border-border bg-surface p-3 transition-colors hover:border-primary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      aria-label={`Task ${task.id}: ${task.title}`}
    >
      <div className="mb-1 flex items-start gap-1">
        <span className="shrink-0 text-xs font-medium text-text-muted">
          {task.id}
        </span>
      </div>
      <p className="mb-2 text-xs font-medium leading-snug text-text-primary line-clamp-2">
        {task.title}
      </p>
      {nextAction && (
        <div className="flex min-w-0 items-center gap-1">
          <ArrowRight
            className="h-3 w-3 shrink-0"
            style={{ color: "#009252" }}
            aria-hidden="true"
          />
          <span className="truncate text-xs text-text-secondary">
            {nextAction}
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
    </div>
  );
}
