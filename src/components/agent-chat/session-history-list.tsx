"use client";

import { Clock, MessageSquareText, Sparkles, Trash2 } from "lucide-react";

import type { ChatSessionSummary } from "@/services/hermes-agent/chat";

type SessionHistoryListProps = {
  sessions: ChatSessionSummary[];
  loading: boolean;
  onSelect: (id: string) => void;
  /** Hard-delete a single session. */
  onDelete?: (id: string) => void;
  /** Hard-delete every session for this feature. */
  onDeleteAll?: () => void;
  /** Per-session unread mention counts, keyed by session id. */
  unreadCounts?: Record<string, number>;
};

function formatRelativeDate(ts: number): string {
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

export function SessionHistoryList({ sessions, loading, onSelect, onDelete, onDeleteAll, unreadCounts = {} }: SessionHistoryListProps) {
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
    <div data-session-history-list className="flex flex-1 flex-col overflow-hidden">
      {onDeleteAll && (
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Conversations</span>
          <button
            type="button"
            data-delete-all-sessions
            onClick={() => {
              if (window.confirm("Delete ALL conversations for this feature? This cannot be undone.")) onDeleteAll();
            }}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            Delete all
          </button>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2 pt-0">
        {sessions.map((s) => {
          const unread = unreadCounts[s.id] ?? 0;
          return (
            <div
              key={s.id}
              className="group relative flex items-stretch rounded-lg border border-border/60 bg-surface-secondary/40 transition-all duration-150 hover:border-primary/40 hover:bg-surface-secondary hover:shadow-sm"
            >
              <button data-session-row={s.id} type="button" onClick={() => onSelect(s.id)} className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5 text-left">
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
                  <span className="block truncate text-[13px] font-semibold text-text-primary">{s.title || "Untitled session"}</span>
                  {s.last_message_excerpt && <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-text-secondary">{s.last_message_excerpt}</span>}
                </div>
              </button>
              {/* Timestamp — vertically centered against the row. */}
              <span className="flex shrink-0 items-center gap-1 self-center px-1 text-[10px] font-medium text-text-muted">
                <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                {formatRelativeDate(s.last_active_at)}
              </span>
              {onDelete && (
                <button
                  type="button"
                  data-delete-session={s.id}
                  aria-label="Delete conversation"
                  onClick={() => {
                    if (window.confirm("Delete this conversation? This cannot be undone.")) onDelete(s.id);
                  }}
                  className="flex w-9 shrink-0 items-center justify-center self-center text-text-muted opacity-50 transition-colors hover:text-danger hover:opacity-100"
                  title="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
