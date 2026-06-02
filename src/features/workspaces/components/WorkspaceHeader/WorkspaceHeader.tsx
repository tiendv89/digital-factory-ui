"use client";

import { Layers, LogOut, RefreshCw, X } from "lucide-react";
import type {
  FeatureTabEntry,
  TaskTabEntry,
} from "../../context/WorkspaceContext";
import { useWorkspaceContext } from "../../context/WorkspaceContext";
import { WorkspaceSwitcher } from "../WorkspaceSwitcher";
import { OrgWorkspaceSwitcher } from "../OrgWorkspaceSwitcher";
import type { SourceState } from "@/services/workflow-backend";
import { useSession } from "@/features/auth";

type WorkspaceHeaderProps = {
  workspaceName: string;
  featureCount: number;
  taskCount: number;
  sourceState?: SourceState | null;
  showMeta?: boolean;
  showTitle?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
};

function formatSyncedTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const hours = date.getUTCHours();
  const displayHours = hours % 12 || 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";

  return `${displayHours}:${minutes}:${seconds} ${suffix}`;
}

function TaskHeaderTab({ entry }: { entry: TaskTabEntry }) {
  const { activeSurface, activeTaskTabId, activateTaskTab, closeTaskTab } =
    useWorkspaceContext();
  const isActive =
    activeSurface === "task-tab" && activeTaskTabId === entry.sessionId;

  function handleClick() {
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
        "group flex h-8 min-w-0 max-w-55 cursor-pointer items-center gap-1.5 border px-2 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
        (isActive
          ? "border-success bg-success-bg text-text-primary"
          : "border-border bg-surface-secondary text-text-secondary hover:bg-surface-subtle hover:text-text-primary")
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
      <span className="min-w-0 truncate" title={entry.title}>
        {entry.title}
      </span>
      <button
        type="button"
        onClick={handleClose}
        aria-label={`Close ${entry.taskName} tab`}
        className="ml-0.5 shrink-0 p-0.5 text-text-muted opacity-70 transition-colors hover:bg-surface hover:text-text-primary group-hover:opacity-100"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

function FeatureHeaderTab({ entry }: { entry: FeatureTabEntry }) {
  const {
    activeSurface,
    activeFeatureTabId,
    activateFeatureTab,
    closeFeatureTab,
  } = useWorkspaceContext();
  const isActive =
    activeSurface === "feature-tab" && activeFeatureTabId === entry.sessionId;

  function handleClick() {
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
        "group flex h-8 min-w-0 max-w-55 cursor-pointer items-center gap-1.5 border px-2 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
        (isActive
          ? "border-success bg-success-bg text-text-primary"
          : "border-border bg-surface-secondary text-text-secondary hover:bg-surface-subtle hover:text-text-primary")
      }
    >
      <Layers
        className={
          "h-3.5 w-3.5 shrink-0 " +
          (isActive ? "text-success" : "text-text-muted")
        }
        aria-hidden="true"
      />
      <span className="min-w-0 truncate" title={entry.title}>
        {entry.title}
      </span>
      <button
        type="button"
        onClick={handleClose}
        aria-label={`Close ${entry.featureName} tab`}
        className="ml-0.5 shrink-0 p-0.5 text-text-muted opacity-70 transition-colors hover:bg-surface hover:text-text-primary group-hover:opacity-100"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

function WorkspaceHeaderTabs({
  fallbackLabel,
  showFallbackLabel = true,
}: {
  fallbackLabel: string;
  showFallbackLabel?: boolean;
}) {
  const { openTaskTabs, openFeatureTabs } = useWorkspaceContext();
  const hasOpenTabs = openTaskTabs.length > 0 || openFeatureTabs.length > 0;

  if (!hasOpenTabs) {
    if (!showFallbackLabel) return null;
    return (
      <h1 className="min-w-0 truncate text-sm font-semibold text-text-primary">
        {fallbackLabel}
      </h1>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Open workspace tabs"
      data-workspace-header-tabs
      className="flex min-w-0 items-center gap-1 overflow-x-auto"
    >
      {openTaskTabs.map((entry) => (
        <TaskHeaderTab key={entry.sessionId} entry={entry} />
      ))}
      {openFeatureTabs.map((entry) => (
        <FeatureHeaderTab key={entry.sessionId} entry={entry} />
      ))}
    </div>
  );
}

export function WorkspaceHeader({
  workspaceName,
  featureCount,
  taskCount,
  sourceState,
  showMeta = false,
  showTitle = true,
  onRefresh,
  refreshing = false,
}: WorkspaceHeaderProps) {
  const { logout } = useSession();

  return (
    <header
      data-workspace-header
      className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-0.5"
    >
      <div className="flex w-fit shrink-0 items-center gap-2">
        <WorkspaceSwitcher />
        <OrgWorkspaceSwitcher />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0 flex-1">
          <WorkspaceHeaderTabs
            fallbackLabel={workspaceName}
            showFallbackLabel={showTitle}
          />
        </div>
        {showMeta && (
          <div className="flex shrink-0 items-center gap-3">
            <span className="shrink-0 text-xs text-text-secondary">
              {featureCount} features
            </span>
            <span className="shrink-0 text-xs text-text-primary">
              {taskCount} tasks
            </span>
            {sourceState?.last_synced_at && (
              <span className="hidden shrink-0 text-[11px] text-text-muted sm:inline">
                {sourceState?.stale
                  ? `⚠️ Last synced: ${formatSyncedTime(sourceState.last_synced_at)}`
                  : `synced ${formatSyncedTime(sourceState.last_synced_at)}`}
              </span>
            )}
          </div>
        )}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh workspace data"
            aria-label="Refresh workspace data"
            className="flex shrink-0 items-center rounded p-1 text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5${refreshing ? " animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
        )}
        <button
          type="button"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          className="ml-1 flex shrink-0 items-center gap-1 rounded p-1 text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
