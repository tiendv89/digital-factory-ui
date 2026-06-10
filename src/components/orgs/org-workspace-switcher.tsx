"use client";

import { Building2, Check, ChevronDown, ChevronRight, Plus, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CreateOrgModal } from "@/components/orgs/create-org-modal";
import { OrgSettingsModal } from "@/components/orgs/org-settings-modal";
import { deriveIconColor } from "@/components/settings/icon-colors";
import { CreateWorkspaceModal } from "@/components/workspaces/create-workspace-modal";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { WorkspaceSettingsModal } from "@/components/workspaces/workspace-settings-page";
import { useOrgWorkspaceSelection } from "@/hooks/workspaces/use-org-workspace-selection";

// ─── Colored initial square ───────────────────────────────────────────────────

function IconSquare({ name, seed, size = 18 }: { name: string | null | undefined; seed: string; size?: number }) {
  const initial = (name?.trim()[0] ?? "?").toUpperCase();
  const radius = size <= 18 ? 6 : size <= 28 ? 8 : 10;
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size <= 18 ? 9 : 11,
        borderRadius: radius,
        background: deriveIconColor(seed),
      }}
    >
      {initial}
    </span>
  );
}

// ─── OrgWorkspaceSwitcher ─────────────────────────────────────────────────────

export function OrgWorkspaceSwitcher() {
  const { memberships, activeMembership, isLoading, isEmpty, switchOrg, switchWorkspace, activeWorkspaceId } = useOrgWorkspaceSelection();
  const { summaries, selectWorkspace } = useWorkspaceContext();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "switch-org">("main");
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showOrgSettings, setShowOrgSettings] = useState(false);
  const [settingsTarget, setSettingsTarget] = useState<{ id: string; name: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setView("main");
    function handlePointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const activeOrgId = activeMembership?.organization_id ?? "";
  // Filter by organization_id when summaries carry it (post-backend-update).
  // Fall back to all summaries if the field is not yet populated (old backend response).
  const summariesHaveOrgId = summaries.some((s) => !!s.organization_id);
  const accessibleSummaries = activeOrgId && summariesHaveOrgId ? summaries.filter((s) => s.organization_id === activeOrgId) : summaries;
  const activeWorkspace = accessibleSummaries.find((w) => w.id === activeWorkspaceId) ?? accessibleSummaries[0] ?? null;

  const handleSwitchWorkspace = useCallback(
    (workspaceId: string) => {
      switchWorkspace(workspaceId);
      selectWorkspace(workspaceId);
      setOpen(false);
    },
    [switchWorkspace, selectWorkspace],
  );

  if (isLoading) {
    return (
      <div aria-label="Loading session" className="flex h-7 items-center gap-1.5 px-2">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex items-center gap-1">
        <div data-org-workspace-empty className="flex h-7 items-center gap-1.5 rounded border border-border bg-surface-secondary px-2 text-xs text-text-muted">
          <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>No organization</span>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateOrg(true)}
          data-create-org-trigger
          aria-label="Create organization"
          className="flex h-7 items-center gap-1 rounded border border-border bg-surface-secondary px-2 text-xs text-text-primary transition-colors hover:bg-surface-subtle hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New Org
        </button>
        {showCreateOrg && <CreateOrgModal onClose={() => setShowCreateOrg(false)} onSuccess={() => setShowCreateOrg(false)} />}
      </div>
    );
  }

  return (
    <>
      <div ref={ref} className="relative" data-org-workspace-switcher>
        {/* Trigger */}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Switch organization or workspace"
          onClick={() => setOpen((v) => !v)}
          className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-text-primary transition-colors hover:bg-surface-secondary"
        >
          <IconSquare name={activeMembership?.organization_name} seed={activeMembership?.organization_id ?? "org"} size={18} />
          <span className="max-w-28 truncate">{activeMembership?.organization_name ?? "—"}</span>
          {activeWorkspace && (
            <>
              <span className="text-text-muted" aria-hidden="true">
                /
              </span>
              <IconSquare name={activeWorkspace.name} seed={activeWorkspace.id} size={18} />
              <span className="max-w-28 truncate">{activeWorkspace.name}</span>
            </>
          )}
          <ChevronDown className={"h-3 w-3 shrink-0 text-text-muted transition-transform " + (open ? "rotate-180" : "")} aria-hidden="true" />
        </button>

        {/* Popup */}
        {open && (
          <div
            className="absolute left-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border"
            style={{
              width: 300,
              backgroundColor: "#2d2d2d",
              borderColor: "#454545",
              boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            }}
            role="dialog"
            aria-label="Organization and workspace switcher"
          >
            {/* ── Main view ────────────────────────────────────────────── */}
            {view === "main" && (
              <>
                {/* Org header */}
                <div className="flex items-center gap-3 border-b px-3 py-3" style={{ borderColor: "#3c3c3c" }}>
                  <IconSquare name={activeMembership?.organization_name} seed={activeMembership?.organization_id ?? "org"} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-text-primary">{activeMembership?.organization_name}</p>
                    {activeMembership && activeMembership.member_count > 0 && (
                      <p className="text-[11px]" style={{ color: "#9d9d9d" }}>
                        {activeMembership.member_count} {activeMembership.member_count === 1 ? "member" : "members"}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setShowOrgSettings(true);
                    }}
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-text-muted transition-colors hover:bg-white/8 hover:text-text-primary"
                    title="Organization settings"
                  >
                    <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                {/* Workspaces list */}
                <div className="py-1">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#9d9d9d" }}>
                    Workspaces
                  </p>
                  {accessibleSummaries.map((ws) => {
                    return (
                      <div key={ws.id} className="group relative flex items-center transition-colors hover:bg-white/5">
                        <button type="button" onClick={() => handleSwitchWorkspace(ws.id)} className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left">
                          <IconSquare name={ws.name} seed={ws.id} size={26} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-text-primary">{ws.name}</p>
                          </div>
                        </button>
                        <div className="flex shrink-0 items-center gap-1 pr-2.5">
                          {ws.id === activeWorkspace?.id && <Check className="h-3 w-3 text-primary" aria-hidden="true" />}
                          <button
                            type="button"
                            aria-label={`Settings for ${ws.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpen(false);
                              setSettingsTarget({ id: ws.id, name: ws.name });
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:bg-white/10 hover:text-text-primary group-hover:opacity-100"
                          >
                            <Settings className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {accessibleSummaries.length === 0 && <p className="px-3 py-2 text-xs italic text-text-muted">No workspaces yet</p>}
                </div>

                {/* Footer */}
                <div className="border-t py-1" style={{ borderColor: "#3c3c3c" }}>
                  <button
                    type="button"
                    data-create-workspace-trigger
                    onClick={() => {
                      setOpen(false);
                      setShowCreateWorkspace(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-text-primary transition-colors hover:bg-white/5"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    New workspace
                  </button>
                  <button type="button" onClick={() => setView("switch-org")} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-text-primary transition-colors hover:bg-white/5">
                    <Building2 className="h-3 w-3" aria-hidden="true" />
                    <span className="flex-1 text-left">Switch organization</span>
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </>
            )}

            {/* ── Switch-org view ───────────────────────────────────────── */}
            {view === "switch-org" && (
              <>
                <div className="flex items-center gap-2 border-b px-3 py-2.5" style={{ borderColor: "#3c3c3c" }}>
                  <button
                    type="button"
                    onClick={() => setView("main")}
                    className="flex h-6 w-6 items-center justify-center rounded text-text-primary transition-colors hover:bg-white/5"
                    aria-label="Back"
                  >
                    <ChevronDown className="h-3.5 w-3.5 rotate-90" aria-hidden="true" />
                  </button>
                  <span className="text-xs font-semibold" style={{ color: "#cccccc" }}>
                    Switch organization
                  </span>
                </div>

                <div className="py-1">
                  {memberships.map((m) => {
                    const hasCounts = m.workspace_count > 0 || m.member_count > 0;
                    const countParts: string[] = [];
                    if (m.workspace_count > 0) countParts.push(`${m.workspace_count} ${m.workspace_count === 1 ? "workspace" : "workspaces"}`);
                    if (m.member_count > 0) countParts.push(`${m.member_count} ${m.member_count === 1 ? "member" : "members"}`);
                    return (
                      <button
                        key={m.organization_id}
                        type="button"
                        onClick={() => {
                          switchOrg(m.organization_slug);
                          const firstWsId = summaries.find((s) => s.organization_id === m.organization_id)?.id ?? null;
                          if (firstWsId) selectWorkspace(firstWsId);
                          setView("main");
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                      >
                        <IconSquare name={m.organization_name} seed={m.organization_id} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-text-primary">{m.organization_name}</p>
                          {hasCounts && (
                            <p className="text-[11px]" style={{ color: "#9d9d9d" }}>
                              {countParts.join(" · ")}
                            </p>
                          )}
                        </div>
                        {m.organization_id === activeMembership?.organization_id && <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t py-1" style={{ borderColor: "#3c3c3c" }}>
                  <button
                    type="button"
                    data-create-org-trigger
                    onClick={() => {
                      setOpen(false);
                      setShowCreateOrg(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-text-primary transition-colors hover:bg-white/5"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Create organization
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showOrgSettings && activeMembership && <OrgSettingsModal membership={activeMembership} onClose={() => setShowOrgSettings(false)} />}
      {showCreateOrg && <CreateOrgModal onClose={() => setShowCreateOrg(false)} onSuccess={() => setShowCreateOrg(false)} />}
      {showCreateWorkspace && <CreateWorkspaceModal onClose={() => setShowCreateWorkspace(false)} onSuccess={() => setShowCreateWorkspace(false)} />}
      {settingsTarget && (
        <WorkspaceSettingsModal workspaceId={settingsTarget.id} orgId={activeMembership?.organization_id ?? ""} workspaceName={settingsTarget.name} onClose={() => setSettingsTarget(null)} />
      )}
    </>
  );
}
