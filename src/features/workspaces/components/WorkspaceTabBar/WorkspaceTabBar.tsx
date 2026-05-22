"use client";

import { LayoutGrid, Layers, X } from "lucide-react";
import { useWorkspaceContext } from "../../context/WorkspaceContext";
import type {
  TaskTabEntry,
  FeatureTabEntry,
} from "../../context/WorkspaceContext";

function WorkspaceTab() {
  const { activeSurface, goToBoard, activeWorkspace } = useWorkspaceContext();
  const isActive = activeSurface === "board";
  const label = activeWorkspace?.name || activeWorkspace?.slug || "Workspace";

  return (
    <button
      type="button"
      data-workspace-tab
      aria-current={isActive ? "true" : undefined}
      onClick={goToBoard}
      className={
        "flex h-9 items-center gap-2 border-r border-border px-4 text-xs font-semibold transition-colors " +
        (isActive
          ? "border-b-2 border-b-success bg-surface text-text-primary"
          : "bg-surface-secondary text-text-secondary hover:bg-surface hover:text-text-primary")
      }
    >
      <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="max-w-30 truncate">{label}</span>
    </button>
  );
}

function TaskTab({ entry }: { entry: TaskTabEntry }) {
  const { activeSurface, activeTaskTabId, activateTaskTab, closeTaskTab } =
    useWorkspaceContext();
  const isActive =
    activeSurface === "task-tab" && activeTaskTabId === entry.sessionId;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    activateTaskTab(entry.sessionId);
  }

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    closeTaskTab(entry.sessionId);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activateTaskTab(entry.sessionId);
    }
  }

  return (
    <div
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
      data-task-tab={entry.sessionId}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={
        "group flex h-9 cursor-pointer items-center gap-2 border-r border-border px-3 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
        (isActive
          ? "border-b-2 border-b-success bg-surface text-text-primary"
          : "bg-surface-secondary text-text-secondary hover:bg-surface hover:text-text-primary")
      }
    >
      <span
        className={
          "shrink-0 border px-1.5 font-mono text-[10px] font-bold leading-4 " +
          (isActive
            ? "border-success/30 bg-success-bg text-success"
            : "border-border bg-surface text-text-muted")
        }
        aria-label={`Task ${entry.taskName}`}
      >
        {entry.taskName}
      </span>
      <span className="max-w-35 truncate" title={entry.title}>
        {entry.title}
      </span>
      <button
        type="button"
        onClick={handleClose}
        aria-label={`Close ${entry.taskName} tab`}
        className="ml-1 shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:bg-surface-subtle hover:text-text-primary group-hover:opacity-100"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

function FeatureTab({ entry }: { entry: FeatureTabEntry }) {
  const {
    activeSurface,
    activeFeatureTabId,
    activateFeatureTab,
    closeFeatureTab,
  } = useWorkspaceContext();
  const isActive =
    activeSurface === "feature-tab" && activeFeatureTabId === entry.sessionId;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    activateFeatureTab(entry.sessionId);
  }

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    closeFeatureTab(entry.sessionId);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activateFeatureTab(entry.sessionId);
    }
  }

  return (
    <div
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
      data-feature-tab={entry.sessionId}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={
        "group flex h-9 cursor-pointer items-center gap-2 border-r border-border px-3 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
        (isActive
          ? "border-b-2 border-b-success bg-surface text-text-primary"
          : "bg-surface-secondary text-text-secondary hover:bg-surface hover:text-text-primary")
      }
    >
      <Layers
        className={
          "h-3.5 w-3.5 shrink-0 " +
          (isActive ? "text-success" : "text-text-muted")
        }
        aria-hidden="true"
      />
      <span className="max-w-35 truncate" title={entry.title}>
        {entry.title}
      </span>
      <button
        type="button"
        onClick={handleClose}
        aria-label={`Close ${entry.featureName} tab`}
        className="ml-1 shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:bg-surface-subtle hover:text-text-primary group-hover:opacity-100"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

export function WorkspaceTabBar() {
  const { openTaskTabs, openFeatureTabs } = useWorkspaceContext();

  return (
    <div
      role="tablist"
      aria-label="Open tabs"
      data-workspace-tab-bar
      className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-border bg-surface-secondary"
    >
      <WorkspaceTab />
      {openTaskTabs.map((entry) => (
        <TaskTab key={entry.sessionId} entry={entry} />
      ))}
      {openFeatureTabs.map((entry) => (
        <FeatureTab key={entry.sessionId} entry={entry} />
      ))}
    </div>
  );
}
