"use client";

import { Bot, LogOut, Settings, Shield, UserCircle } from "lucide-react";
import { useState } from "react";

import { useSession } from "@/components/auth";

import { AgentDefaultsTab } from "./agent-defaults-tab";
import { ProfileTab } from "./profile-tab";
import { SecurityTab } from "./security-tab";

type TabId = "profile" | "security" | "agent-defaults";

type TabDef = {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  placeholder?: boolean;
};

const TABS: TabDef[] = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "security", label: "Security", icon: Shield, placeholder: true },
  { id: "agent-defaults", label: "Agent defaults", icon: Bot, placeholder: true },
];

export function SettingsPage({ initialTab }: { initialTab?: TabId }) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? "profile");

  const { logout } = useSession();

  const TabContent = (
    {
      profile: ProfileTab,
      security: SecurityTab,
      "agent-defaults": AgentDefaultsTab,
    } as Record<TabId, React.ComponentType | null>
  )[activeTab];

  return (
    <div data-settings-page className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside aria-label="Settings navigation" className="flex w-52 shrink-0 flex-col border-r border-border bg-surface py-4">
        <div className="mb-3 flex items-center gap-2 px-4">
          <Settings className="h-4 w-4 text-text-muted" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Settings</span>
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
                  "flex w-full items-center gap-2.5 border-l-2 px-4 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
                  (isActive ? "border-primary bg-surface-secondary font-medium text-text-primary" : "border-transparent text-text-secondary hover:bg-nav-item-hover hover:text-text-primary")
                }
              >
                <Icon className={"h-4 w-4 shrink-0 " + (isActive ? "text-accent-foreground" : "")} aria-hidden />
                <span className="flex-1 truncate">{tab.label}</span>
                {tab.placeholder && (
                  <span aria-label="placeholder" className="rounded border border-border bg-chip-bg px-1 py-0 text-[10px] text-text-muted">
                    soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border pt-3">
          <button
            type="button"
            onClick={() => void logout()}
            data-settings-logout
            aria-label="Sign out"
            className="mt-1 flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-danger"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main id={`settings-panel-${activeTab}`} role="tabpanel" aria-label={TABS.find((t) => t.id === activeTab)?.label} className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">{TabContent ? <TabContent /> : null}</div>
      </main>
    </div>
  );
}
