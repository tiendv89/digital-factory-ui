"use client";

import { LogOut, Search, UserCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

import { useSession } from "@/components/auth";
import { Avatar, cn } from "@/components/common";
import { OrgWorkspaceSwitcher } from "@/components/orgs/org-workspace-switcher";
import { deriveIconColor } from "@/components/settings/icon-colors";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";

const ROUTE_LABELS: Record<string, string> = {
  "/board": "Features",
  "/inbox": "Inbox",
  "/team": "Team",
  "/settings": "Settings",
};

type BreadcrumbSegment = { label: string; href?: string };

function useBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const { activeWorkspace } = useWorkspaceContext();

  if (pathname.startsWith("/feature/")) {
    const featureId = decodeURIComponent(pathname.slice("/feature/".length));
    // The URL carries the feature UUID (feature_id), not the row PK (id).
    const feature = activeWorkspace?.features.find((f) => f.feature_id === featureId || f.id === featureId);
    const name = feature?.feature_name ?? featureId;
    return [{ label: "Features", href: "/board" }, { label: name }];
  }

  if (pathname.startsWith("/task/")) {
    const taskId = decodeURIComponent(pathname.slice("/task/".length));
    const task = activeWorkspace?.tasks.find((t) => t.id === taskId);
    const featureId = task?.feature_id;
    const feature = featureId ? activeWorkspace?.features.find((f) => f.feature_id === featureId || f.id === featureId) : undefined;
    const featureName = feature?.feature_name ?? task?.feature_name ?? "Feature";
    const taskName = task?.task_name ?? taskId;
    return [{ label: "Features", href: "/board" }, ...(featureId ? [{ label: featureName, href: `/feature/${encodeURIComponent(featureId)}` }] : [{ label: featureName }]), { label: taskName }];
  }

  if (pathname.startsWith("/admin")) {
    const sub: Record<string, string> = { "/admin/plans": "Plans", "/admin/users": "Users", "/admin/orgs": "Orgs" };
    const section = sub[pathname];
    return [{ label: "Admin", href: "/admin/plans" }, ...(section ? [{ label: section }] : [])];
  }

  if (pathname.startsWith("/settings")) {
    return [{ label: "Settings" }];
  }

  const label = ROUTE_LABELS[pathname] ?? "Board";
  return [{ label }];
}

function UserMenu() {
  const { session, logout } = useSession();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  if (session.status !== "authenticated") return null;

  const meData = session.data.data;
  const user = meData.user;
  const displayName = user.display_name ?? null;
  const avatarUrl = user.avatar_url ?? null;
  const name = displayName || user.email;
  const userId = user.id ?? "user";

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="menu"
        data-user-menu-trigger
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {avatarUrl ? <img src={avatarUrl} alt={name ?? "avatar"} className="h-8 w-8 rounded-full object-cover" /> : <Avatar name={name} color={deriveIconColor(userId)} size="sm" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div role="menu" aria-label="User menu" data-user-menu className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-surface shadow-lg">
            <div className="border-b border-border px-3 py-2.5">
              <p className="truncate text-xs font-medium text-text-primary">{name}</p>
              <p className="truncate text-[11px] text-text-muted">{user.email}</p>
            </div>
            <Link
              href="/settings/profile"
              role="menuitem"
              data-user-menu-profile
              onClick={() => setOpen(false)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary transition-colors",
                "hover:bg-nav-item-hover hover:text-text-primary focus:outline-none focus-visible:bg-nav-item-hover",
              )}
            >
              <UserCircle className="h-4 w-4 shrink-0" aria-hidden />
              Profile settings
            </Link>
            <button
              type="button"
              role="menuitem"
              data-user-menu-logout
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger transition-colors", "hover:bg-danger-bg focus:outline-none focus-visible:bg-danger-bg")}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type TopbarProps = {
  onCommandPalette?: () => void;
};

export function Topbar({ onCommandPalette }: TopbarProps) {
  const pathname = usePathname();
  const segments = useBreadcrumbs(pathname);

  return (
    <header aria-label="Application toolbar" data-topbar className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-topbar px-4">
      <OrgWorkspaceSwitcher />

      <span aria-hidden className="h-4 w-px shrink-0 bg-border" />

      <nav data-breadcrumb aria-label="Breadcrumb" className="flex items-center gap-1.5">
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="text-[11px] text-text-muted">
                /
              </span>
            )}
            {seg.href ? (
              <Link href={seg.href} className="text-xs text-text-muted transition-colors hover:text-text-secondary">
                {seg.label}
              </Link>
            ) : (
              <span className="text-xs text-text-secondary" aria-current="page">
                {seg.label}
              </span>
            )}
          </span>
        ))}
      </nav>

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

      <UserMenu />
    </header>
  );
}
