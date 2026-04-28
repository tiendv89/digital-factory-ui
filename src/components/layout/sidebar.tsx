"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List, CheckSquare } from "lucide-react";
import { useWorkspace } from "@/context/workspace-context";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", Icon: LayoutDashboard },
  { label: "Features", href: "/features", Icon: List },
  { label: "Tasks", href: "/tasks", Icon: CheckSquare },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { activeWorkspaceId } = useWorkspace();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-border bg-surface">
      {/* Workspace header */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            background:
              "linear-gradient(135deg, #5465e8 0%, #6c7fff 100%)",
          }}
        >
          <span className="text-xs font-bold text-white">DF</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">
            {activeWorkspaceId ?? "No workspace"}
          </p>
          <p className="text-xs text-text-muted">Workspace</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-4">
        {NAV_ITEMS.map(({ label, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className={[
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-primary-light text-primary"
                : "text-text-secondary hover:bg-bg hover:text-text-primary",
            ].join(" ")}
            style={
              isActive(href)
                ? { backgroundColor: "rgba(84,101,232,0.08)" }
                : undefined
            }
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom workspace area */}
      <div className="border-t border-border px-3 pb-4 pt-[17px]">
        <div className="rounded-lg px-3 py-2">
          <p className="text-xs text-text-muted">Active workspace</p>
          <p className="mt-0.5 truncate text-sm font-medium text-text-primary">
            {activeWorkspaceId ?? "—"}
          </p>
        </div>
      </div>
    </aside>
  );
}
