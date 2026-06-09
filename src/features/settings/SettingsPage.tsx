"use client";

import { useState } from "react";
import { User, Bell, Shield, Bot, Settings, Layers } from "lucide-react";
import { AccountTab } from "./tabs/AccountTab";
import { NotificationsTab } from "./tabs/NotificationsTab";
import { SecurityTab } from "./tabs/SecurityTab";
import { AgentDefaultsTab } from "./tabs/AgentDefaultsTab";
import { WorkspaceSettingsPage } from "@/features/workspaces/components/WorkspaceSettings";

type TabId = "account" | "notifications" | "security" | "agent-defaults" | "workspace-settings";

type TabDef = {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  placeholder?: boolean;
};

const TABS: TabDef[] = [
  { id: "account", label: "Account", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield, placeholder: true },
  { id: "agent-defaults", label: "Agent defaults", icon: Bot, placeholder: true },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("account");

  const isWorkspaceSettings = activeTab === "workspace-settings";

  const TabContent = isWorkspaceSettings
    ? null
    : ({
        account: AccountTab,
        notifications: NotificationsTab,
        security: SecurityTab,
        "agent-defaults": AgentDefaultsTab,
        "workspace-settings": null,
      } as Record<TabId, React.ComponentType | null>)[activeTab];

  return (
    <div
      data-settings-page
      className="flex h-full overflow-hidden"
    >
      {/* Sidebar */}
      <aside
        aria-label="Settings navigation"
        className="flex w-52 shrink-0 flex-col border-r border-border bg-surface py-4"
      >
        <div className="mb-3 flex items-center gap-2 px-4">
          <Settings className="h-4 w-4 text-text-muted" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Settings
          </span>
        </div>
        <nav aria-label="Settings sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`settings-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                data-settings-tab={tab.id}
                className={
                  "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
                  (isActive
                    ? "bg-nav-item-active font-medium text-text-primary"
                    : "text-text-secondary hover:bg-nav-item-hover hover:text-text-primary")
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1 truncate">{tab.label}</span>
                {tab.placeholder && (
                  <span
                    aria-label="placeholder"
                    className="rounded border border-border bg-chip-bg px-1 py-0 text-[10px] text-text-muted"
                  >
                    soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Workspace settings — T13 */}
        <div className="mt-auto border-t border-border pt-3">
          <button
            type="button"
            disabled
            title="Organisation settings — coming soon"
            className="flex w-full cursor-not-allowed items-center gap-2.5 px-4 py-2 text-left text-sm text-text-muted opacity-50"
            data-settings-tab="org-settings"
            aria-label="Organisation settings (coming soon)"
          >
            <Bot className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">Org settings</span>
            <span className="rounded border border-border bg-chip-bg px-1 py-0 text-[10px]">
              soon
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "workspace-settings"}
            aria-controls="settings-panel-workspace-settings"
            onClick={() => setActiveTab("workspace-settings")}
            data-settings-tab="workspace-settings"
            className={
              "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
              (activeTab === "workspace-settings"
                ? "bg-nav-item-active font-medium text-text-primary"
                : "text-text-secondary hover:bg-nav-item-hover hover:text-text-primary")
            }
          >
            <Layers className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">Workspace settings</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main
        id={`settings-panel-${activeTab}`}
        role="tabpanel"
        aria-label={
          activeTab === "workspace-settings"
            ? "Workspace settings"
            : TABS.find((t) => t.id === activeTab)?.label
        }
        className="flex-1 overflow-y-auto p-6"
      >
        <div className="mx-auto max-w-2xl">
          {isWorkspaceSettings ? (
            <WorkspaceSettingsPage />
          ) : TabContent ? (
            <TabContent />
          ) : null}
        </div>
      </main>
    </div>
  );
}
