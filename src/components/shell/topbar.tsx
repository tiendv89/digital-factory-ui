"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

import { useSession } from "@/components/auth";
import { OrgWorkspaceSwitcher } from "@/components/orgs/org-workspace-switcher";

const ROUTE_LABELS: Record<string, string> = {
  "/board": "Board",
  "/inbox": "Inbox",
  "/team": "Team",
  "/settings": "Settings",
};

function getBreadcrumb(pathname: string): string {
  if (pathname.startsWith("/feature/")) return "Feature IDE";
  if (pathname.startsWith("/task/")) return "Task Review";
  return ROUTE_LABELS[pathname] ?? "Board";
}

type TopbarProps = {
  onCommandPalette?: () => void;
};

export function Topbar({ onCommandPalette }: TopbarProps) {
  const pathname = usePathname();
  const { logout } = useSession();
  const breadcrumb = getBreadcrumb(pathname);

  return (
    <header aria-label="Application toolbar" data-topbar className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-topbar px-4">
      <OrgWorkspaceSwitcher />

      <span aria-hidden className="h-4 w-px shrink-0 bg-border" />

      <span data-breadcrumb className="text-xs text-text-secondary" aria-current="page">
        {breadcrumb}
      </span>

      <div className="flex-1" />

      {/* Command palette — prominent centered search */}
      <button
        type="button"
        aria-label="Open command palette"
        data-topbar-command-palette
        title="Command Palette (⌘K)"
        onClick={onCommandPalette}
        className="flex h-[30px] min-w-[200px] items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 font-mono text-xs text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Search className="h-3 w-3 shrink-0" aria-hidden />
        <span>Search or run a command…</span>
        <kbd aria-hidden className="ml-auto text-[10px] opacity-70">
          ⌘K
        </kbd>
      </button>
    </header>
  );
}
