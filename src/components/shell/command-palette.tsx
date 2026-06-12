"use client";

import { Modal } from "@heroui/react";
import { ArrowRight, Bot, LayoutGrid, Search, Settings, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSession } from "@/components/auth";

// ── Item types ────────────────────────────────────────────────────────────────

type NavItem = {
  kind: "nav";
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;
  href: string;
};

type ActionItem = {
  kind: "action";
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;
  group: "actions" | "agent";
  requiresAdmin: boolean;
};

type PaletteItem = NavItem | ActionItem;

// ── Static item registries ─────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { kind: "nav", id: "nav-board", label: "Board", hint: "Go to Board", icon: LayoutGrid, href: "/board" },
  { kind: "nav", id: "nav-settings", label: "Settings", hint: "Go to Settings", icon: Settings, href: "/settings" },
];

const ACTION_ITEMS: ActionItem[] = [
  {
    kind: "action",
    id: "action-approve-design",
    label: "Approve Design",
    hint: "Mark the feature design as approved — placeholder",
    icon: Zap,
    group: "actions",
    requiresAdmin: true,
  },
  {
    kind: "action",
    id: "action-mark-ready",
    label: "Mark Task Ready",
    hint: "Set a task to ready for implementation — placeholder",
    icon: ArrowRight,
    group: "actions",
    requiresAdmin: true,
  },
  {
    kind: "action",
    id: "action-request-changes",
    label: "Request Changes",
    hint: "Request changes on a pull request — placeholder",
    icon: ArrowRight,
    group: "actions",
    requiresAdmin: false,
  },
];

const AGENT_ITEMS: ActionItem[] = [
  {
    kind: "action",
    id: "agent-start-run",
    label: "Start Agent Run",
    hint: "Kick off a new agent execution — placeholder",
    icon: Bot,
    group: "agent",
    requiresAdmin: false,
  },
  {
    kind: "action",
    id: "agent-assign",
    label: "Assign to Agent",
    hint: "Assign a task to an available agent — placeholder",
    icon: Bot,
    group: "agent",
    requiresAdmin: false,
  },
];

// ── Filter helper ─────────────────────────────────────────────────────────────

function filterItems<T extends { label: string; hint: string }>(items: T[], query: string): T[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter((item) => item.label.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q));
}

// ── CommandPalette component ──────────────────────────────────────────────────

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const isAdmin = session.status === "authenticated" && session.data.data.memberships.some((m) => m.role === "admin");

  // Build visible items based on query + permissions
  const visibleNavItems = useMemo(() => filterItems(NAV_ITEMS, query), [query]);
  const visibleActionItems = useMemo(
    () =>
      filterItems(
        ACTION_ITEMS.filter((a) => !a.requiresAdmin || isAdmin),
        query,
      ),
    [isAdmin, query],
  );
  const visibleAgentItems = useMemo(() => filterItems(AGENT_ITEMS, query), [query]);

  const allItems: PaletteItem[] = useMemo(() => [...visibleNavItems, ...visibleActionItems, ...visibleAgentItems], [visibleNavItems, visibleActionItems, visibleAgentItems]);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Defer focus so the dialog has rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Clamp active index when items change
  useEffect(() => {
    if (activeIndex >= allItems.length) {
      setActiveIndex(Math.max(0, allItems.length - 1));
    }
  }, [allItems.length, activeIndex]);

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      if (item.kind === "nav") {
        router.push(item.href);
        onClose();
      }
      // Action/agent items are placeholders — close but take no backend action
      if (item.kind === "action") {
        onClose();
      }
    },
    [router, onClose],
  );

  // Keyboard navigation within palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, allItems.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = allItems[activeIndex];
        if (item) handleSelect(item);
      }
    },
    [allItems, activeIndex, handleSelect, onClose],
  );

  let itemIndex = 0;

  return (
    <Modal.Root
      isOpen={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Modal.Backdrop variant="opaque" isDismissable>
        <Modal.Container placement="top" className="pt-[20vh]">
          <Modal.Dialog aria-label="Command palette" className="p-0 w-full max-w-lg flex flex-col overflow-hidden rounded-[13px] border border-border bg-surface shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
            <div data-command-palette className="flex flex-col" onKeyDown={handleKeyDown}>
              {/* Search input */}
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                <input
                  ref={inputRef}
                  data-command-palette-input
                  type="text"
                  placeholder="Search or run a command…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                  aria-autocomplete="list"
                  aria-controls="command-palette-results"
                />
                <kbd aria-hidden className="rounded border border-border bg-surface-secondary px-1 font-mono text-[10px] text-text-muted">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div id="command-palette-results" data-command-palette-results role="listbox" className="max-h-80 overflow-y-auto py-1">
                {allItems.length === 0 && <p className="px-4 py-6 text-center text-sm text-text-muted">No results for &ldquo;{query}&rdquo;</p>}

                {/* Navigate group */}
                {visibleNavItems.length > 0 && (
                  <div data-command-palette-group="navigate">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Navigate</div>
                    {visibleNavItems.map((item) => {
                      const idx = itemIndex++;
                      const isActive = idx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          data-command-palette-item={item.id}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={
                            "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors " +
                            (isActive ? "bg-surface-subtle text-text-primary" : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary")
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                          <span className="flex-1 font-medium">{item.label}</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-muted opacity-60" aria-hidden />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Actions group */}
                {visibleActionItems.length > 0 && (
                  <div data-command-palette-group="actions">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Actions</div>
                    {visibleActionItems.map((item) => {
                      const idx = itemIndex++;
                      const isActive = idx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          data-command-palette-item={item.id}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={
                            "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors " +
                            (isActive ? "bg-surface-subtle text-text-primary" : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary")
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                          <span className="flex-1 font-medium">{item.label}</span>
                          <span data-command-palette-placeholder className="rounded border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-text-muted">
                            placeholder
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Agent group */}
                {visibleAgentItems.length > 0 && (
                  <div data-command-palette-group="agent">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Agent</div>
                    {visibleAgentItems.map((item) => {
                      const idx = itemIndex++;
                      const isActive = idx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          data-command-palette-item={item.id}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={
                            "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors " +
                            (isActive ? "bg-surface-subtle text-text-primary" : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary")
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                          <span className="flex-1 font-medium">{item.label}</span>
                          <span data-command-palette-placeholder className="rounded border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-text-muted">
                            placeholder
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer hints */}
              <div className="flex items-center gap-4 border-t border-border px-3 py-2 text-[11px] text-text-muted">
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-border bg-surface-secondary px-1 font-mono text-[10px]">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-border bg-surface-secondary px-1 font-mono text-[10px]">↵</kbd>
                  run
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-border bg-surface-secondary px-1 font-mono text-[10px]">esc</kbd>
                  close
                </span>
              </div>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
