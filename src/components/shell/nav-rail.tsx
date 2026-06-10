"use client";

import { GitBranch, LayoutGrid, Settings, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/components/common";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { useBoardStore } from "@/stores/board";

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

type NavRailProps = {
  onCommandPalette?: () => void;
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

export function NavRail({ onCommandPalette }: NavRailProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const nonTaskItems = MAIN_ITEMS.filter((i) => i.href !== "/tasks");

  return (
    <nav aria-label="Main navigation" data-navrail className="flex w-16 shrink-0 flex-col items-center border-r border-border bg-surface py-3">
      {/* Brand mark */}
      <div className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
        <Zap className="h-4 w-4 text-white" fill="currentColor" aria-hidden />
      </div>

      <div className="flex flex-1 flex-col items-center gap-1">
        {nonTaskItems.map((item) => (
          <NavRailLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        <TasksNavButton active={isActive("/tasks") || isActive("/task")} />
      </div>

      <div className="flex flex-col items-center gap-1">
        <NavRailLink item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM.href)} />
      </div>
    </nav>
  );
}
