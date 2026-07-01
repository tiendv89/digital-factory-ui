"use client";

import { GitBranch, LayoutGrid, Settings, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useSession } from "@/components/auth";
import { cn } from "@/components/common";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { getUnreadMentions } from "@/services/hermes-agent/chat";
import { getMeData } from "@/services/user-service";
import { useBoardStore } from "@/stores/board";
import { isPlatformAdmin } from "@/utils/platform-role";

const UNREAD_POLL_INTERVAL_MS = 30_000;

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

const MAIN_ITEMS: NavItem[] = [
  { label: "Board", href: "/board", icon: LayoutGrid },
  { label: "Feature IDE", href: "/feature", icon: Zap },
  { label: "Task Review", href: "/tasks", icon: GitBranch },
];

const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
};

const ADMIN_ITEM: NavItem = {
  label: "Admin",
  href: "/admin/plans",
  icon: Shield,
};

function NavRailLink({ item, active }: { item: NavItem; active: boolean }) {
  const { label, href, icon: Icon } = item;
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      data-nav-item={label.toLowerCase()}
      title={label}
      className={cn(
        "relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active ? "bg-nav-item-active text-accent-foreground" : "text-text-muted hover:bg-nav-item-hover hover:text-text-primary",
      )}
    >
      {active && <span aria-hidden className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-primary" />}
      <Icon className="h-5 w-5" aria-hidden />
    </Link>
  );
}

function TasksNavButton({ active }: { active: boolean }) {
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceContext();
  const lastViewedTaskId = useBoardStore((s) => s.lastViewedTaskId);

  function handleClick() {
    const tasks = activeWorkspace?.tasks ?? [];
    const target = lastViewedTaskId ? tasks.find((t) => t.id === lastViewedTaskId) : null;
    const taskId = target?.id ?? tasks[0]?.id ?? null;
    router.push(taskId ? `/task/${taskId}` : "/tasks");
  }

  return (
    <button
      type="button"
      aria-label="Task Review"
      aria-current={active ? "page" : undefined}
      data-nav-item="task review"
      title="Task Review"
      onClick={handleClick}
      className={cn(
        "relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active ? "bg-nav-item-active text-accent-foreground" : "text-text-muted hover:bg-nav-item-hover hover:text-text-primary",
      )}
    >
      {active && <span aria-hidden className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-primary" />}
      <GitBranch className="h-5 w-5" aria-hidden />
    </button>
  );
}

function useWorkspaceUnreadCount(): number {
  const [count, setCount] = useState(0);
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? "";
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCount = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await getUnreadMentions(workspaceId);
      setCount(data.total);
    } catch {}
  }, [workspaceId]);

  useEffect(() => {
    void fetchCount();
    timerRef.current = setInterval(() => void fetchCount(), UNREAD_POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchCount]);

  return count;
}

export function NavRail() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const unreadCount = useWorkspaceUnreadCount();

  const { session } = useSession();
  const isAdmin = session.status === "authenticated" && isPlatformAdmin(getMeData(session.data));

  const nonTaskItems = MAIN_ITEMS.filter((i) => i.href !== "/tasks");

  return (
    <nav aria-label="Main navigation" data-navrail className="flex w-16 shrink-0 flex-col items-center border-r border-border bg-surface py-3">
      {/* Brand mark */}
      <div className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
        <Zap className="h-4 w-4 text-white" fill="currentColor" aria-hidden />
      </div>

      <div className="flex flex-1 flex-col items-center gap-1">
        {nonTaskItems.map((item) => {
          const isFeatureIde = item.href === "/feature";
          return (
            <div key={item.href} className="relative">
              <NavRailLink item={item} active={isActive(item.href)} />
              {isFeatureIde && unreadCount > 0 && (
                <span
                  data-unread-aggregate
                  aria-label={`${unreadCount} unread mention${unreadCount === 1 ? "" : "s"}`}
                  className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-white"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          );
        })}
        <TasksNavButton active={isActive("/tasks") || isActive("/task")} />
      </div>

      <div className="flex flex-col items-center gap-1">
        {isAdmin && <NavRailLink item={ADMIN_ITEM} active={pathname.startsWith("/admin")} />}
        <NavRailLink item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM.href)} />
      </div>
    </nav>
  );
}
