"use client";

import { Clock3 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import type { ParsedFeature } from "@/services/yaml-parser";
import {
  formatTimestamp,
  getFeatureLastModifiedAt,
  isTodayTimestamp,
} from "@/lib/time";
import { getFeatureStatusColor, getFeatureStatusLabel } from "../../lib/status";

type FeatureListRowProps = {
  feature: ParsedFeature;
  onClick: () => void;
  onOpenNewTab?: () => void;
};

function FeatureStatusPill({ status }: { status: string }) {
  const color = getFeatureStatusColor(status);
  const label = getFeatureStatusLabel(status);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function FeatureListRow({
  feature,
  onClick,
  onOpenNewTab,
}: FeatureListRowProps) {
  const lastModifiedAt = getFeatureLastModifiedAt(feature);
  const modifiedToday = lastModifiedAt
    ? isTodayTimestamp(lastModifiedAt)
    : false;
  const totalTasks = feature.taskCounts?.total ?? feature.tasks.length;
  const taskCountLabel = `${totalTasks} ${totalTasks === 1 ? "task" : "tasks"}`;

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
      onClick();
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
      onOpenNewTab();
    }
    setMenuPosition(null);
  }

  return (
    <div
      data-feature-card-status={feature.featureStatus}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      aria-label={`Open feature tab for ${feature.title || feature.id}`}
      className="flex h-full min-h-[82px] w-full cursor-pointer flex-col gap-2 border border-border bg-surface px-3 py-3 text-left transition-colors hover:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <FeatureStatusPill status={feature.featureStatus} />
      </div>

      <div className="min-w-0">
        <p
          className="truncate text-sm font-semibold uppercase text-text-primary"
          title={feature.id}
        >
          {feature.id}
        </p>
        {feature.title && feature.title !== feature.id && (
          <p
            className="truncate text-xs text-text-secondary"
            title={feature.title}
          >
            {feature.title}
          </p>
        )}
      </div>

      <div className="mt-auto flex min-w-0 items-center gap-3 text-xs text-text-muted">
        <span className="shrink-0">{taskCountLabel}</span>
        {lastModifiedAt && (
          <span
            data-feature-modified-at={lastModifiedAt}
            data-modified-today={modifiedToday ? "true" : "false"}
            className={
              "flex min-w-0 shrink-0 items-center gap-1.5 rounded px-1.5 py-0.5 text-xs " +
              (modifiedToday
                ? "bg-success-bg font-semibold text-success"
                : "text-text-muted")
            }
            title={`Modified ${lastModifiedAt}`}
          >
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{formatTimestamp(lastModifiedAt)}</span>
          </span>
        )}
      </div>

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
