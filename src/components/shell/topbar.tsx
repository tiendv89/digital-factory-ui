"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/components/auth";
import { OrgWorkspaceSwitcher } from "@/components/orgs/org-workspace-switcher";
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
    const feature = activeWorkspace?.features.find((f) => f.id === featureId);
    const name = feature?.feature_name ?? featureId;
    return [{ label: "Features", href: "/board" }, { label: name }];
  }

  if (pathname.startsWith("/task/")) {
    const taskId = decodeURIComponent(pathname.slice("/task/".length));
    const task = activeWorkspace?.tasks.find((t) => t.id === taskId);
    const featureId = task?.feature_id;
    const feature = featureId ? activeWorkspace?.features.find((f) => f.id === featureId) : undefined;
    const featureName = feature?.feature_name ?? task?.feature_name ?? "Feature";
    const taskName = task?.task_name ?? taskId;
    return [{ label: "Features", href: "/board" }, ...(featureId ? [{ label: featureName, href: `/feature/${encodeURIComponent(featureId)}` }] : [{ label: featureName }]), { label: taskName }];
  }

  const label = ROUTE_LABELS[pathname] ?? "Board";
  return [{ label }];
}

type TopbarProps = {
  onCommandPalette?: () => void;
};

export function Topbar({ onCommandPalette }: TopbarProps) {
  const pathname = usePathname();
  const { logout } = useSession();
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
    </header>
  );
}
