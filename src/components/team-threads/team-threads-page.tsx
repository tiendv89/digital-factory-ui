"use client";

import { Loader2, MessageCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import type { WorkspaceThreadSummary } from "@/services/hermes-agent/chat";
import { createWorkspaceThread, listWorkspaceThreads } from "@/services/hermes-agent/chat";

import { CreateThreadModal } from "./create-thread-modal";

export function TeamThreadsPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const router = useRouter();

  const [threads, setThreads] = useState<WorkspaceThreadSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const workspaceId = activeWorkspace?.id ?? "";

  const loadThreads = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listWorkspaceThreads(workspaceId);
      setThreads(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load threads");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const handleCreate = useCallback(
    async (title?: string, members?: string[]) => {
      if (!workspaceId) return;
      const thread = await createWorkspaceThread(workspaceId, title, members);
      setThreads((prev) => [thread, ...prev]);
      setCreateOpen(false);
      router.push(`/team-threads/${thread.id}`);
    },
    [workspaceId, router],
  );

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-muted">No workspace selected.</p>
      </div>
    );
  }

  return (
    <div data-team-threads-page className="flex h-full flex-col bg-bg">
      <header className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-border px-6">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-text-muted" aria-hidden />
          <h1 className="text-sm font-semibold text-text-primary">Team Chat</h1>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New thread
        </button>
      </header>

      <div className="flex-1 overflow-auto px-6 py-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" aria-hidden />
          </div>
        )}

        {error && !loading && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

        {!loading && !error && threads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <MessageCircle className="h-10 w-10 text-text-muted/40" aria-hidden />
            <p className="text-sm text-text-muted">No team threads yet. Start one to collaborate.</p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-text-primary"
            >
              New thread
            </button>
          </div>
        )}

        {!loading && threads.length > 0 && (
          <ul className="flex flex-col gap-1.5" role="list">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/team-threads/${thread.id}`)}
                  className="group flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-surface-secondary"
                  aria-label={`Open thread ${thread.title ?? "Untitled thread"}`}
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text-primary">{thread.title ?? "Untitled thread"}</div>
                    {thread.member_count != null && (
                      <div className="text-xs text-text-muted mt-0.5">
                        {thread.member_count} member{thread.member_count === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateThreadModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} workspaceId={workspaceId} />
    </div>
  );
}
