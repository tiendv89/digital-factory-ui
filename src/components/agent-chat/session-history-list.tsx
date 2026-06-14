"use client";

import { Clock, MessageSquareText, Sparkles } from "lucide-react";

import type { ChatSessionSummary } from "@/services/hermes-agent/chat";

type SessionHistoryListProps = {
  sessions: ChatSessionSummary[];
  loading: boolean;
  onSelect: (id: string) => void;
  /** Per-session unread mention counts, keyed by session id. */
  unreadCounts?: Record<string, number>;
};

function formatRelativeDate(ts: number): string {
  // The backend sends Unix timestamps in seconds; normalize to milliseconds.
  // (Values below ~1e12 ms predate 2001, so they must be second-based.)
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-start gap-3 rounded-lg border border-border/50 bg-surface-secondary/30 px-3 py-2.5">
      <div className="h-7 w-7 shrink-0 rounded-md bg-surface-hover" />
      <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
        <div className="h-2.5 w-1/2 rounded bg-surface-hover" />
        <div className="h-2 w-4/5 rounded bg-surface-hover" />
      </div>
    </div>
  );
}

export function SessionHistoryList({ sessions, loading, onSelect, unreadCounts = {} }: SessionHistoryListProps) {
  if (loading) {
    return (
      <div data-session-history-list className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div data-session-history-list className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-secondary text-text-muted">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-text-secondary">No conversations yet</p>
          <p className="text-[11px] text-text-muted">Start a new chat below to see it appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-session-history-list className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
      {sessions.map((s) => {
        const unread = unreadCounts[s.id] ?? 0;
        return (
          <button
            key={s.id}
            data-session-row={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="group flex w-full items-start gap-3 rounded-lg border border-border/60 bg-surface-secondary/40 px-3 py-2.5 text-left transition-all duration-150 hover:border-primary/40 hover:bg-surface-secondary hover:shadow-sm"
          >
            <div className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-muted transition-colors group-hover:border-primary/40 group-hover:text-primary">
              <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
              {unread > 0 && (
                <span
                  data-unread-badge
                  aria-label={`${unread} unread mention${unread === 1 ? "" : "s"}`}
                  className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-white"
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-semibold text-text-primary">{s.title || "Untitled session"}</span>
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-text-muted">
                  <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                  {formatRelativeDate(s.last_active_at)}
                </span>
              </div>
              {s.last_message_excerpt && <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-text-secondary">{s.last_message_excerpt}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
