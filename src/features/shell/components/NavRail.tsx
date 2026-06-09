"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  MessageSquare,
  Users,
  Settings,
  Search,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Board", href: "/board", icon: LayoutGrid },
  { label: "Inbox", href: "/inbox", icon: MessageSquare },
  { label: "Team", href: "/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

type NavRailProps = {
  onCommandPalette?: () => void;
};

export function NavRail({ onCommandPalette }: NavRailProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      data-navrail
      className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-nav-rail py-2"
    >
      <div className="flex flex-1 flex-col items-center gap-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              data-nav-item={label.toLowerCase()}
              title={label}
              className={
                "flex h-9 w-9 items-center justify-center rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
                (isActive
                  ? "bg-nav-item-active text-text-primary"
                  : "text-text-muted hover:bg-nav-item-hover hover:text-text-primary")
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
            </Link>
          );
        })}
      </div>

      {onCommandPalette && (
        <button
          type="button"
          aria-label="Open command palette"
          data-nav-command-palette
          title="Command Palette (⌘K)"
          onClick={onCommandPalette}
          className="flex h-9 w-9 items-center justify-center rounded text-text-muted transition-colors hover:bg-nav-item-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>
      )}
    </nav>
  );
}
