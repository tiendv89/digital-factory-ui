"use client";

import { Loader2, MessageCircle, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AgentChatPanel } from "@/components/agent-chat";
import { ThreadMembersPanel } from "@/components/channels/thread-members-panel";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import type { WorkspaceThreadSummary } from "@/services/hermes-agent/chat";
import { listWorkspaceThreads } from "@/services/hermes-agent/chat";

type WorkspaceThreadChatPageProps = {
  threadId: string;
};

export function WorkspaceThreadChatPage({ threadId }: WorkspaceThreadChatPageProps) {
  const { activeWorkspace } = useWorkspaceContext();
  const router = useRouter();
  const workspaceId = activeWorkspace?.id ?? "";

  const [thread, setThread] = useState<WorkspaceThreadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);

  useEffect(() => {
    if (!workspaceId || !threadId) return;
    setLoading(true);
    setError(null);
    listWorkspaceThreads(workspaceId)
      .then((list) => {
        const found = list.find((t) => t.id === threadId) ?? null;
        setThread(found);
        if (!found) setError("Thread not found.");
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load thread");
        setLoading(false);
      });
  }, [workspaceId, threadId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" aria-hidden />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-text-muted">{error ?? "Thread not found."}</p>
        <button type="button" onClick={() => router.push("/team-threads")} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary">
          Back to Team Chat
        </button>
      </div>
    );
  }

  return (
    <div data-workspace-thread-chat-page className="flex h-full overflow-hidden">
      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border px-4">
          <MessageCircle className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          <div className="min-w-0 flex-1">
            <span className="truncate text-sm font-semibold text-text-primary">{thread.title ?? "Untitled thread"}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setMembersOpen((v) => !v)}
              aria-label="Toggle members panel"
              title="Members"
              className="flex h-8 w-8 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              <Users className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </header>

        {/* Workspace thread uses the shared subscription-based chat surface (T6). */}
        {/* featureId='' ensures no feature authoring/approval affordances render (NG12). */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <AgentChatPanel workspaceId={workspaceId} featureId="" requestSessionId={threadId} useSubscriptionTransport />
        </div>
      </div>

      {/* Members side panel (T8 ThreadMembersPanel) */}
      {membersOpen && (
        <aside className="w-64 shrink-0 border-l border-border">
          <ThreadMembersPanel threadId={threadId} workspaceId={workspaceId} />
        </aside>
      )}
    </div>
  );
}
