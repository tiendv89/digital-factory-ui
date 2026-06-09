"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Building2, Layers, Plus } from "lucide-react";
import { useOrgWorkspaceSelection } from "@/features/workspaces/hooks/useOrgWorkspaceSelection";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { CreateOrgModal } from "@/features/workspaces/components/CreateOrgModal";
import { CreateWorkspaceModal } from "@/features/workspaces/components/CreateWorkspaceModal";
import type { MeMembership } from "@/services/user-service";
import type { LocalWorkspaceSummary } from "@/services/workflow-backend";

// ─── OrgDropdown ─────────────────────────────────────────────────────────────

function OrgDropdown({
  memberships,
  activeMembership,
  onSelect,
  onCreateOrg,
}: {
  memberships: MeMembership[];
  activeMembership: MeMembership | null;
  onSelect: (slug: string) => void;
  onCreateOrg: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleSelect = useCallback(
    (slug: string) => {
      onSelect(slug);
      setOpen(false);
    },
    [onSelect],
  );

  const handleCreateOrg = useCallback(() => {
    setOpen(false);
    onCreateOrg();
  }, [onCreateOrg]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch organization"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1.5 rounded border border-border bg-surface-secondary px-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
        <span className="max-w-32 truncate">{activeMembership?.organization_name ?? "—"}</span>
        <ChevronDown
          className={"h-3 w-3 shrink-0 text-text-muted transition-transform " + (open ? "rotate-180" : "")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Available organizations"
          className="absolute left-0 top-full z-50 mt-1 min-w-48 border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border bg-surface-secondary px-2.5 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
              Switch Organization
            </span>
          </div>
          <div className="py-1">
            {memberships.map((m) => {
              const isActive = m.organization_slug === activeMembership?.organization_slug;
              return (
                <button
                  key={m.organization_id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(m.organization_slug)}
                  className={
                    "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-surface-subtle " +
                    (isActive ? "bg-surface-subtle" : "")
                  }
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="flex-1 truncate font-semibold text-text-primary">
                    {m.organization_name}
                  </span>
                  <span className="text-[10px] text-text-muted">{m.role}</span>
                  {isActive && (
                    <Check className="h-3 w-3 shrink-0 text-success" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="border-t border-border p-1">
            <button
              type="button"
              onClick={handleCreateOrg}
              data-create-org-trigger
              className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-text-primary transition-colors hover:bg-surface-subtle"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Create Organization
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WorkspaceDropdown ────────────────────────────────────────────────────────

function WorkspaceDropdown({
  workspaces,
  activeWorkspaceId,
  onSelect,
  onCreateWorkspace,
}: {
  workspaces: LocalWorkspaceSummary[];
  activeWorkspaceId: string | null;
  onSelect: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const activeWorkspace = workspaces.find((w) => w.workspaceId === activeWorkspaceId);

  const handleSelect = useCallback(
    (workspaceId: string) => {
      onSelect(workspaceId);
      setOpen(false);
    },
    [onSelect],
  );

  const handleCreateWorkspace = useCallback(() => {
    setOpen(false);
    onCreateWorkspace();
  }, [onCreateWorkspace]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch workspace"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1.5 rounded border border-border bg-surface-secondary px-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
      >
        <Layers className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
        <span className="max-w-32 truncate">
          {activeWorkspace?.name ?? activeWorkspaceId ?? "—"}
        </span>
        <ChevronDown
          className={"h-3 w-3 shrink-0 text-text-muted transition-transform " + (open ? "rotate-180" : "")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Available workspaces"
          className="absolute left-0 top-full z-50 mt-1 min-w-48 border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border bg-surface-secondary px-2.5 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
              Switch Workspace
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {workspaces.map((w) => {
              const isActive = w.workspaceId === activeWorkspaceId;
              return (
                <button
                  key={w.workspaceId}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(w.workspaceId)}
                  className={
                    "flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-surface-subtle " +
                    (isActive ? "bg-surface-subtle" : "")
                  }
                >
                  <Layers className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="flex-1 truncate text-[11px] font-semibold text-text-primary">
                    {w.name}
                  </span>
                  {isActive && (
                    <Check className="h-3 w-3 shrink-0 text-success" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="border-t border-border p-1">
            <button
              type="button"
              onClick={handleCreateWorkspace}
              data-create-workspace-trigger
              className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-text-primary transition-colors hover:bg-surface-subtle"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Create Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OrgWorkspaceSwitcher ─────────────────────────────────────────────────────

export function OrgWorkspaceSwitcher() {
  const {
    memberships,
    activeMembership,
    accessibleWorkspaceIds,
    isLoading,
    isEmpty,
    switchOrg,
    switchWorkspace,
    activeWorkspaceId,
  } = useOrgWorkspaceSelection();

  const { summaries, selectWorkspace } = useWorkspaceContext();

  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);

  // Cross-reference local summaries with accessible_workspace_ids.
  // If none match (e.g. dev env with stub data), fall back to showing all summaries.
  const filteredByAccess =
    accessibleWorkspaceIds.length > 0
      ? summaries.filter((s) => accessibleWorkspaceIds.includes(s.workspaceId))
      : [];
  const accessibleSummaries =
    filteredByAccess.length > 0 ? filteredByAccess : summaries;

  const handleSwitchWorkspace = useCallback(
    (workspaceId: string) => {
      switchWorkspace(workspaceId);
      selectWorkspace(workspaceId);
    },
    [switchWorkspace, selectWorkspace],
  );

  if (isLoading) {
    return (
      <div
        aria-label="Loading session"
        className="flex h-7 items-center gap-1.5 px-2"
      >
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex items-center gap-1">
        <div
          data-org-workspace-empty
          className="flex h-7 items-center gap-1.5 rounded border border-border bg-surface-secondary px-2 text-xs text-text-muted"
        >
          <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>No organization</span>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateOrg(true)}
          data-create-org-trigger
          aria-label="Create organization"
          className="flex h-7 items-center gap-1 rounded border border-border bg-surface-secondary px-2 text-xs text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New Org
        </button>
        {showCreateOrg && (
          <CreateOrgModal
            onClose={() => setShowCreateOrg(false)}
            onSuccess={() => setShowCreateOrg(false)}
          />
        )}
      </div>
    );
  }

  const multiOrg = memberships.length >= 2;
  const multiWorkspace = accessibleSummaries.length >= 2;

  return (
    <>
      <div className="flex items-center gap-1" data-org-workspace-switcher>
        {multiOrg ? (
          <OrgDropdown
            memberships={memberships}
            activeMembership={activeMembership}
            onSelect={switchOrg}
            onCreateOrg={() => setShowCreateOrg(true)}
          />
        ) : activeMembership ? (
          <div
            className="flex h-7 items-center gap-1.5 rounded border border-border bg-surface-secondary px-2 text-xs font-semibold text-text-secondary"
            data-org-label
            aria-label={`Organization: ${activeMembership.organization_name}`}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
            <span className="max-w-32 truncate">{activeMembership.organization_name}</span>
          </div>
        ) : null}

        {accessibleSummaries.length > 0 && (
          <>
            <span className="text-text-muted" aria-hidden="true">/</span>
            {multiWorkspace ? (
              <WorkspaceDropdown
                workspaces={accessibleSummaries}
                activeWorkspaceId={activeWorkspaceId}
                onSelect={handleSwitchWorkspace}
                onCreateWorkspace={() => setShowCreateWorkspace(true)}
              />
            ) : (
              <div
                className="flex h-7 items-center gap-1.5 rounded border border-border bg-surface-secondary px-2 text-xs font-semibold text-text-secondary"
                data-workspace-label
                aria-label={`Workspace: ${accessibleSummaries[0]?.name}`}
              >
                <Layers className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                <span className="max-w-32 truncate">{accessibleSummaries[0]?.name}</span>
              </div>
            )}
          </>
        )}

        {accessibleSummaries.length === 0 && activeMembership && (
          <>
            <span className="text-text-muted" aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => setShowCreateWorkspace(true)}
              data-create-workspace-trigger
              aria-label="Create workspace"
              className="flex h-7 items-center gap-1 rounded border border-border bg-surface-secondary px-2 text-xs text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New Workspace
            </button>
          </>
        )}
      </div>

      {showCreateOrg && (
        <CreateOrgModal
          onClose={() => setShowCreateOrg(false)}
          onSuccess={() => setShowCreateOrg(false)}
        />
      )}
      {showCreateWorkspace && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWorkspace(false)}
          onSuccess={() => setShowCreateWorkspace(false)}
        />
      )}
    </>
  );
}
