"use client";

import { usePathname } from "next/navigation";
import { Search, LogOut } from "lucide-react";
import { OrgWorkspaceSwitcher } from "@/features/workspaces/components/OrgWorkspaceSwitcher";
import { useSession } from "@/features/auth";

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
    <header
      aria-label="Application toolbar"
      data-topbar
      className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-topbar px-3"
    >
      <span
        data-breadcrumb
        className="text-sm font-semibold text-text-primary"
        aria-current="page"
      >
        {breadcrumb}
      </span>

      <div className="flex-1" />

      <OrgWorkspaceSwitcher />

      <button
        type="button"
        aria-label="Open command palette"
        data-topbar-command-palette
        title="Command Palette (⌘K)"
        onClick={onCommandPalette}
        className="flex h-7 items-center gap-1.5 rounded border border-border bg-surface-secondary px-2 text-xs text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Search className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Search</span>
        <kbd
          aria-hidden
          className="hidden rounded border border-border bg-surface px-1 font-mono text-[10px] text-text-muted sm:inline"
        >
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        aria-label="Sign out"
        data-topbar-logout
        onClick={() => void logout()}
        className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </button>
    </header>
  );
}
