"use client";

import type { ChatSessionSummary } from "@/services/workflow-backend/chat";

type SessionHistoryListProps = {
  sessions: ChatSessionSummary[];
  loading: boolean;
  onSelect: (id: string) => void;
};

function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function SessionHistoryList({
  sessions,
  loading,
  onSelect,
}: SessionHistoryListProps) {
  if (loading) {
    return (
      <div
        data-session-history-list
        className="flex flex-1 items-center justify-center"
      >
        <span className="text-xs text-text-secondary">Loading…</span>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div
        data-session-history-list
        className="flex flex-1 items-center justify-center px-4 text-center"
      >
        <p className="text-xs text-text-secondary">No conversations yet.</p>
      </div>
    );
  }

  return (
    <div
      data-session-history-list
      className="flex flex-1 flex-col overflow-y-auto"
    >
      {sessions.map((s) => (
        <button
          key={s.id}
          data-session-row={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-surface-hover"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold text-text-primary">
              {s.title}
            </span>
            <span className="shrink-0 text-xs text-text-secondary">
              {formatRelativeDate(s.last_active_at)}
            </span>
          </div>
          {s.last_message_excerpt && (
            <span className="line-clamp-1 text-xs text-text-secondary">
              {s.last_message_excerpt}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
