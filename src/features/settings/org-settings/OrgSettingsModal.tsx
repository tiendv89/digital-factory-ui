"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Settings, Users, Layers, AlertTriangle } from "lucide-react";
import { useSession } from "@/features/auth";
import { getMeData } from "@/services/user-service";
import type { MeMembership, OrgRole } from "@/services/user-service";
import { OrgGeneralTab } from "./OrgGeneralTab";
import { OrgMembersTab } from "./OrgMembersTab";
import { OrgWorkspacesTab } from "./OrgWorkspacesTab";
import { OrgDangerZoneTab } from "./OrgDangerZoneTab";

type OrgTabId = "general" | "members" | "workspaces" | "danger-zone";

const ORG_TABS: { id: OrgTabId; label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "members", label: "Members", icon: Users },
  { id: "workspaces", label: "Workspaces", icon: Layers },
  { id: "danger-zone", label: "Danger zone", icon: AlertTriangle },
];

interface OrgSettingsModalProps {
  membership: MeMembership;
  onClose: () => void;
  onOrgDeleted?: () => void;
}

export function OrgSettingsModal({
  membership,
  onClose,
  onOrgDeleted,
}: OrgSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<OrgTabId>("general");
  const { session } = useSession();

  const meData = session.status === "authenticated" ? getMeData(session.data) : null;
  const currentUserId = meData?.user.id ?? "";
  const userRole = membership.role as OrgRole;
  const orgId = membership.organization_id;
  const orgName = membership.organization_name;

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleOrgDeleted = useCallback(() => {
    onOrgDeleted?.();
    onClose();
  }, [onOrgDeleted, onClose]);

  const canAccessDanger = userRole === "admin" || userRole === "platform_admin";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${orgName} settings`}
      data-org-settings-modal
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative flex h-[80vh] max-h-[640px] w-full max-w-3xl overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
        {/* Sidebar */}
        <aside
          aria-label="Org settings navigation"
          className="flex w-48 shrink-0 flex-col border-r border-border bg-surface py-4"
        >
          <div className="mb-3 px-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Organisation
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
              {orgName}
            </p>
            <p className="truncate font-mono text-[10px] text-text-muted">
              @{membership.organization_slug}
            </p>
          </div>

          <nav aria-label="Organisation settings sections">
            {ORG_TABS.map((tab) => {
              if (tab.id === "danger-zone" && !canAccessDanger) return null;
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`org-settings-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  data-org-settings-tab={tab.id}
                  className={
                    "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
                    (isActive
                      ? "bg-nav-item-active font-medium text-text-primary"
                      : tab.id === "danger-zone"
                        ? "text-danger/70 hover:bg-danger-bg hover:text-danger"
                        : "text-text-secondary hover:bg-nav-item-hover hover:text-text-primary")
                  }
                >
                  <Icon
                    className={
                      "h-4 w-4 shrink-0 " +
                      (tab.id === "danger-zone" ? "text-danger/70" : "")
                    }
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto px-4 pb-1">
            <span
              className={
                "inline-block rounded border px-2 py-0.5 text-[10px] font-medium capitalize " +
                (userRole === "platform_admin"
                  ? "border-purple/30 bg-purple-bg text-purple"
                  : userRole === "admin"
                    ? "border-primary/30 bg-primary-light text-primary"
                    : "border-border bg-chip-bg text-text-secondary")
              }
            >
              {userRole === "platform_admin" ? "platform admin" : userRole}
            </span>
          </div>
        </aside>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              {ORG_TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close org settings"
              className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-nav-item-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Tab content */}
          <main
            id={`org-settings-panel-${activeTab}`}
            role="tabpanel"
            aria-label={ORG_TABS.find((t) => t.id === activeTab)?.label}
            className="flex-1 overflow-y-auto px-6 py-5"
          >
            {activeTab === "general" && (
              <OrgGeneralTab orgId={orgId} userRole={userRole} />
            )}
            {activeTab === "members" && (
              <OrgMembersTab
                orgId={orgId}
                currentUserId={currentUserId}
                userRole={userRole}
              />
            )}
            {activeTab === "workspaces" && (
              <OrgWorkspacesTab orgId={orgId} />
            )}
            {activeTab === "danger-zone" && canAccessDanger && (
              <OrgDangerZoneTab
                orgId={orgId}
                orgName={orgName}
                currentUserId={currentUserId}
                userRole={userRole}
                onOrgDeleted={handleOrgDeleted}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
