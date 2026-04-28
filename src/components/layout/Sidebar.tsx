"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Tasks", href: "/tasks" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { activeWorkspaceId } = useWorkspace();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-(--color-border) bg-(--color-surface)">
      {/* Workspace header */}
      <div className="flex h-16 items-center gap-2 border-b border-(--color-border) px-5">
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
          <p className="truncate text-sm font-semibold text-(--color-text-primary)">
            {activeWorkspaceId ?? "No workspace"}
          </p>
          <p className="text-xs text-(--color-text-muted)">Workspace</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-4">
        {NAV_ITEMS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={[
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-(--color-primary-light) text-(--color-primary)"
                : "text-(--color-text-secondary) hover:bg-(--color-bg) hover:text-(--color-text-primary)",
            ].join(" ")}
            style={
              isActive(href)
                ? { backgroundColor: "rgba(84,101,232,0.08)" }
                : undefined
            }
          >
            <NavIcon label={label} active={isActive(href)} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom workspace area */}
      <div className="border-t border-(--color-border) px-3 pb-4 pt-[17px]">
        <div className="rounded-lg px-3 py-2">
          <p className="text-xs text-(--color-text-muted)">Active workspace</p>
          <p className="mt-0.5 truncate text-sm font-medium text-(--color-text-primary)">
            {activeWorkspaceId ?? "—"}
          </p>
        </div>
      </div>
    </aside>
  );
}

function NavIcon({ label, active }: { label: string; active: boolean }) {
  const color = active ? "#5465e8" : "#5a6380";
  if (label === "Dashboard") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="6" height="6" rx="1" fill={color} />
        <rect x="9" y="1" width="6" height="6" rx="1" fill={color} />
        <rect x="1" y="9" width="6" height="6" rx="1" fill={color} />
        <rect x="9" y="9" width="6" height="6" rx="1" fill={color} />
      </svg>
    );
  }
  if (label === "Features") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 4h12M2 8h8M2 12h10"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // Tasks
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="1.5"
        width="13"
        height="13"
        rx="2"
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M5 8l2 2 4-4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
