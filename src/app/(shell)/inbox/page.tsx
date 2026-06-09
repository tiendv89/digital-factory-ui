"use client";

import { useState } from "react";
import {
  MessageSquare,
  ShieldCheck,
  HelpCircle,
  AlertOctagon,
  Info,
  CheckCircle,
  MessageCircleReply,
  XCircle,
  MinusCircle,
  Construction,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type InboxItemType = "gate" | "question" | "block" | "fyi";

type InboxItem = {
  id: string;
  type: InboxItemType;
  featureId: string;
  featureName: string;
  taskId: string;
  taskTitle: string;
  summary: string;
  actor: string;
  age: string;
};

type FilterTab = "all" | InboxItemType;

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_ITEMS: InboxItem[] = [
  {
    id: "item-1",
    type: "gate",
    featureId: "ui-revamp",
    featureName: "UI Revamp",
    taskId: "T3",
    taskTitle: "Board reskin",
    summary: "Shall I proceed with the KanbanBoard layout refactor? The existing column widths will change.",
    actor: "Agent",
    age: "2m ago",
  },
  {
    id: "item-2",
    type: "question",
    featureId: "ui-revamp",
    featureName: "UI Revamp",
    taskId: "T4",
    taskTitle: "Feature IDE workbench",
    summary: "Which panel should be the default focus when no document is open — Explorer or Agent chat?",
    actor: "Agent",
    age: "15m ago",
  },
  {
    id: "item-3",
    type: "block",
    featureId: "ui-revamp",
    featureName: "UI Revamp",
    taskId: "T12",
    taskTitle: "Org settings UI",
    summary: "Blocked on missing RequireOrgAdminAuth guard — user-service endpoint returns 403.",
    actor: "Agent",
    age: "1h ago",
  },
  {
    id: "item-4",
    type: "fyi",
    featureId: "ui-revamp",
    featureName: "UI Revamp",
    taskId: "T7",
    taskTitle: "Login page reskin",
    summary: "PR #118 merged. Login page now matches the dark VS Code design.",
    actor: "Orchestrator",
    age: "3h ago",
  },
  {
    id: "item-5",
    type: "gate",
    featureId: "workflow-db",
    featureName: "Workflow DB",
    taskId: "T2",
    taskTitle: "Schema migration",
    summary: "Migration adds a NOT NULL column to tasks (50 M rows). Proceed with backfill?",
    actor: "Agent",
    age: "5h ago",
  },
  {
    id: "item-6",
    type: "fyi",
    featureId: "workflow-db",
    featureName: "Workflow DB",
    taskId: "T1",
    taskTitle: "Postgres adapter",
    summary: "All 142 integration tests passing against local Postgres. Ready for review.",
    actor: "Agent",
    age: "6h ago",
  },
];

// ── Tab config ─────────────────────────────────────────────────────────────────

type TabConfig = {
  id: FilterTab;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

const FILTER_TABS: TabConfig[] = [
  { id: "all", label: "All", icon: MessageSquare },
  { id: "gate", label: "Gate", icon: ShieldCheck },
  { id: "question", label: "Questions", icon: HelpCircle },
  { id: "block", label: "Blocks", icon: AlertOctagon },
  { id: "fyi", label: "FYI", icon: Info },
];

// ── Item type helpers ─────────────────────────────────────────────────────────

function itemTypeColor(type: InboxItemType): string {
  switch (type) {
    case "gate":
      return "text-primary";
    case "question":
      return "text-warning";
    case "block":
      return "text-danger";
    case "fyi":
      return "text-text-secondary";
  }
}

function itemTypeBg(type: InboxItemType): string {
  switch (type) {
    case "gate":
      return "bg-primary-light";
    case "question":
      return "bg-warning-bg";
    case "block":
      return "bg-danger-bg";
    case "fyi":
      return "bg-surface-secondary";
  }
}

function ItemTypeIcon({ type }: { type: InboxItemType }) {
  switch (type) {
    case "gate":
      return <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${itemTypeColor(type)}`} aria-hidden />;
    case "question":
      return <HelpCircle className={`h-3.5 w-3.5 shrink-0 ${itemTypeColor(type)}`} aria-hidden />;
    case "block":
      return <AlertOctagon className={`h-3.5 w-3.5 shrink-0 ${itemTypeColor(type)}`} aria-hidden />;
    case "fyi":
      return <Info className={`h-3.5 w-3.5 shrink-0 ${itemTypeColor(type)}`} aria-hidden />;
  }
}

function itemTypeLabel(type: InboxItemType): string {
  switch (type) {
    case "gate":
      return "Gate";
    case "question":
      return "Question";
    case "block":
      return "Block";
    case "fyi":
      return "FYI";
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlaceholderBanner() {
  return (
    <div
      data-inbox-banner
      className="flex items-center gap-2 border-b border-border bg-warning-bg px-4 py-2"
    >
      <Construction className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
      <p className="text-xs text-warning">
        <span className="font-semibold">Inbox is not yet wired.</span>
        {" "}Actions are stubbed — a decision/gate API is required before this view becomes functional.
      </p>
    </div>
  );
}

type FilterTabsProps = {
  active: FilterTab;
  counts: Record<FilterTab, number>;
  onChange: (tab: FilterTab) => void;
};

function FilterTabs({ active, counts, onChange }: FilterTabsProps) {
  return (
    <div
      data-inbox-filter-tabs
      role="tablist"
      aria-label="Inbox filter"
      className="flex items-center gap-1 border-b border-border px-4 py-1"
    >
      {FILTER_TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        const count = counts[id];
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-tab={id}
            onClick={() => onChange(id)}
            className={
              "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
              (isActive
                ? "bg-nav-item-active text-text-primary"
                : "text-text-muted hover:bg-nav-item-hover hover:text-text-primary")
            }
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
            {count > 0 && (
              <span
                className={
                  "rounded-full px-1.5 py-0.5 text-[10px] leading-none " +
                  (isActive ? "bg-primary/30 text-text-primary" : "bg-chip-bg text-text-muted")
                }
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

type InboxItemRowProps = {
  item: InboxItem;
};

function InboxItemRow({ item }: InboxItemRowProps) {
  return (
    <div
      data-inbox-item={item.id}
      className="flex items-start gap-3 border-b border-border px-4 py-3 hover:bg-surface-subtle"
    >
      {/* Type indicator */}
      <div
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded ${itemTypeBg(item.type)}`}
      >
        <ItemTypeIcon type={item.type} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide ${itemTypeColor(item.type)}`}
          >
            {itemTypeLabel(item.type)}
          </span>
          <span className="text-[10px] text-text-muted">
            {item.featureName} · {item.taskId}: {item.taskTitle}
          </span>
          <span className="ml-auto text-[10px] text-text-muted">{item.age}</span>
        </div>
        <p className="mt-0.5 text-sm text-text-secondary line-clamp-2">{item.summary}</p>
        <p className="mt-0.5 text-[10px] text-text-muted">from {item.actor}</p>
      </div>

      {/* Actions — disabled stubs */}
      <div className="flex shrink-0 items-center gap-1.5">
        {item.type === "gate" && (
          <>
            <button
              type="button"
              disabled
              title="Approve (not yet wired)"
              aria-label="Approve"
              data-action="approve"
              className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-medium text-text-muted opacity-40 cursor-not-allowed"
            >
              <CheckCircle className="h-3 w-3" aria-hidden />
              Approve
            </button>
            <button
              type="button"
              disabled
              title="Reject (not yet wired)"
              aria-label="Reject"
              data-action="reject"
              className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-medium text-text-muted opacity-40 cursor-not-allowed"
            >
              <XCircle className="h-3 w-3" aria-hidden />
              Reject
            </button>
          </>
        )}
        {item.type === "question" && (
          <button
            type="button"
            disabled
            title="Reply (not yet wired)"
            aria-label="Reply"
            data-action="reply"
            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-medium text-text-muted opacity-40 cursor-not-allowed"
          >
            <MessageCircleReply className="h-3 w-3" aria-hidden />
            Reply
          </button>
        )}
        {item.type === "block" && (
          <button
            type="button"
            disabled
            title="Resolve (not yet wired)"
            aria-label="Resolve"
            data-action="resolve"
            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-medium text-text-muted opacity-40 cursor-not-allowed"
          >
            <CheckCircle className="h-3 w-3" aria-hidden />
            Resolve
          </button>
        )}
        {item.type === "fyi" && (
          <button
            type="button"
            disabled
            title="Dismiss (not yet wired)"
            aria-label="Dismiss"
            data-action="dismiss"
            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-medium text-text-muted opacity-40 cursor-not-allowed"
          >
            <MinusCircle className="h-3 w-3" aria-hidden />
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

type FeatureGroupProps = {
  featureId: string;
  featureName: string;
  items: InboxItem[];
};

function FeatureGroup({ featureId, featureName, items }: FeatureGroupProps) {
  return (
    <section data-inbox-group={featureId} aria-label={`${featureName} inbox items`}>
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-1.5 sticky top-0 z-10">
        <span className="text-xs font-semibold text-text-secondary">{featureName}</span>
        <span className="rounded-full bg-chip-bg px-1.5 py-0.5 text-[10px] text-text-muted">
          {items.length}
        </span>
      </div>
      {items.map((item) => (
        <InboxItemRow key={item.id} item={item} />
      ))}
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filteredItems =
    activeTab === "all"
      ? MOCK_ITEMS
      : MOCK_ITEMS.filter((item) => item.type === activeTab);

  const counts: Record<FilterTab, number> = {
    all: MOCK_ITEMS.length,
    gate: MOCK_ITEMS.filter((i) => i.type === "gate").length,
    question: MOCK_ITEMS.filter((i) => i.type === "question").length,
    block: MOCK_ITEMS.filter((i) => i.type === "block").length,
    fyi: MOCK_ITEMS.filter((i) => i.type === "fyi").length,
  };

  // Group by feature
  const featureGroups: Map<string, { featureId: string; featureName: string; items: InboxItem[] }> =
    new Map();
  for (const item of filteredItems) {
    const existing = featureGroups.get(item.featureId);
    if (existing) {
      existing.items.push(item);
    } else {
      featureGroups.set(item.featureId, {
        featureId: item.featureId,
        featureName: item.featureName,
        items: [item],
      });
    }
  }

  return (
    <div
      data-inbox-page
      className="flex h-full flex-col"
    >
      <PlaceholderBanner />

      <FilterTabs active={activeTab} counts={counts} onChange={setActiveTab} />

      <div className="flex-1 overflow-auto">
        {filteredItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <MessageSquare className="h-8 w-8 text-text-muted" aria-hidden />
            <p className="text-sm text-text-muted">No items in this filter.</p>
          </div>
        ) : (
          Array.from(featureGroups.values()).map((group) => (
            <FeatureGroup
              key={group.featureId}
              featureId={group.featureId}
              featureName={group.featureName}
              items={group.items}
            />
          ))
        )}
      </div>
    </div>
  );
}
