"use client";

import { Modal } from "@heroui/react";
import { AlertTriangle, Globe, Settings, Users, X } from "lucide-react";
import { useCallback, useState } from "react";

import { useSession } from "@/components/auth";
import { Avatar, Badge } from "@/components/common";
import type { MeMembership, OrgRole } from "@/services/user-service";
import { getMeData } from "@/services/user-service";

import { deriveIconColor } from "../settings/icon-colors";
import { OrgDangerZoneTab } from "./org-danger-zone-tab";
import { OrgGeneralTab } from "./org-general-tab";
import { OrgMembersTab } from "./org-members-tab";
import { OrgWorkspacesTab } from "./org-workspaces-tab";

type OrgTabId = "general" | "members" | "workspaces" | "danger-zone";

const ORG_TABS: {
  id: OrgTabId;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "members", label: "Members", icon: Users },
  { id: "workspaces", label: "Workspaces", icon: Globe },
  { id: "danger-zone", label: "Danger zone", icon: AlertTriangle },
];

interface OrgSettingsModalProps {
  membership: MeMembership;
  onClose: () => void;
  onOrgDeleted?: () => void;
}

export function OrgSettingsModal({ membership, onClose, onOrgDeleted }: OrgSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<OrgTabId>("general");
  const { session } = useSession();

  const meData = session.status === "authenticated" ? getMeData(session.data) : null;
  const currentUserId = meData?.user.id ?? "";
  const userRole = membership.role as OrgRole;
  const orgId = membership.organization_id;
  const orgName = membership.organization_name;
  const orgColor = deriveIconColor(orgId);

  const handleOrgDeleted = useCallback(() => {
    onOrgDeleted?.();
    onClose();
  }, [onOrgDeleted, onClose]);

  const canAccessDanger = userRole === "admin";

  return (
    <Modal.Root
      isOpen
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Modal.Backdrop variant="opaque" isDismissable>
        <Modal.Container placement="center">
          <Modal.Dialog
            data-org-settings-modal
            className="p-0 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[13px] border border-border bg-surface shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
          >
            {/* Full-width header */}
            <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-semibold text-text-primary">Organization settings</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close org settings"
                className="rounded p-1 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div className="flex min-h-0 flex-1">
              {/* Sidebar */}
              <aside aria-label="Org settings navigation" className="flex w-52 shrink-0 flex-col border-r border-border p-3">
                {/* Org identity */}
                <div className="mb-3 flex items-center gap-2.5 px-1.5 py-1">
                  <Avatar name={orgName} color={orgColor} shape="square" size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">{orgName}</p>
                    <p className="truncate font-mono text-[11px] text-text-muted">/{membership.organization_slug}</p>
                  </div>
                </div>

                <nav aria-label="Organisation settings sections" className="flex flex-col gap-0.5">
                  {ORG_TABS.map((tab) => {
                    if (tab.id === "danger-zone" && !canAccessDanger) return null;
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const isDanger = tab.id === "danger-zone";
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
                          "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
                          (isActive
                            ? "bg-nav-item-active text-text-primary"
                            : isDanger
                              ? "text-danger hover:bg-surface-secondary"
                              : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary")
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="flex-1 truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-auto px-1.5 pt-3">
                  <Badge tone={userRole === "admin" ? "primary" : "neutral"} className="capitalize">
                    {userRole}
                  </Badge>
                </div>
              </aside>

              {/* Content */}
              <main id={`org-settings-panel-${activeTab}`} role="tabpanel" aria-label={ORG_TABS.find((t) => t.id === activeTab)?.label} className="min-w-0 flex-1 overflow-y-auto p-6">
                {activeTab === "general" && <OrgGeneralTab orgId={orgId} userRole={userRole} orgColor={orgColor} />}
                {activeTab === "members" && <OrgMembersTab orgId={orgId} currentUserId={currentUserId} userRole={userRole} />}
                {activeTab === "workspaces" && <OrgWorkspacesTab orgId={orgId} />}
                {activeTab === "danger-zone" && canAccessDanger && (
                  <OrgDangerZoneTab orgId={orgId} orgName={orgName} currentUserId={currentUserId} userRole={userRole} onOrgDeleted={handleOrgDeleted} />
                )}
              </main>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
