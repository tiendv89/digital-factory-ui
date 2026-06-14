"use client";

import { Hash, Loader2, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AgentChatPanel } from "@/components/agent-chat";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import type { ChannelSummary } from "@/services/hermes-agent/chat";
import { deleteChannel, joinChannel, listChannels } from "@/services/hermes-agent/chat";
import { getCallerWorkspaceRole } from "@/services/user-service";

import { ThreadMembersPanel } from "./thread-members-panel";

type ChannelChatPageProps = {
  channelId: string;
};

export function ChannelChatPage({ channelId }: ChannelChatPageProps) {
  const { activeWorkspace } = useWorkspaceContext();
  const router = useRouter();
  const workspaceId = activeWorkspace?.id ?? "";

  const [channel, setChannel] = useState<ChannelSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!workspaceId || !channelId) return;
    setLoading(true);
    setError(null);
    listChannels(workspaceId)
      .then((list) => {
        const found = list.find((c) => c.id === channelId) ?? null;
        setChannel(found);
        if (!found) setError("Channel not found.");
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load channel");
        setLoading(false);
      });
  }, [workspaceId, channelId]);

  useEffect(() => {
    if (!workspaceId) return;
    getCallerWorkspaceRole(workspaceId)
      .then((role) => setIsAdmin(role === "admin"))
      .catch(() => setIsAdmin(false));
  }, [workspaceId]);

  // Auto-join the channel on open so the user can receive messages.
  useEffect(() => {
    if (!channelId || joinedRef.current) return;
    joinedRef.current = true;
    joinChannel(channelId).catch(() => {
      // If join fails (already a member or not found), that's ok.
    });
  }, [channelId]);

  const handleDelete = useCallback(async () => {
    if (!channel) return;
    setDeleting(true);
    try {
      await deleteChannel(channel.id);
      router.push("/channels");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete channel");
      setDeleting(false);
    }
  }, [channel, router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" aria-hidden />
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-text-muted">{error ?? "Channel not found."}</p>
        <button type="button" onClick={() => router.push("/channels")} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary">
          Back to channels
        </button>
      </div>
    );
  }

  return (
    <div data-channel-chat-page className="flex h-full overflow-hidden">
      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border px-4">
          <Hash className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          <div className="min-w-0 flex-1">
            <span className="truncate text-sm font-semibold text-text-primary">{channel.name}</span>
            {channel.description && <span className="ml-2 truncate text-xs text-text-muted">{channel.description}</span>}
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
            {isAdmin && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                aria-label="Delete channel"
                title="Delete channel (admin only)"
                className="flex h-8 w-8 items-center justify-center rounded text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-40"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
              </button>
            )}
          </div>
        </header>

        {/* Channel uses the shared subscription-based chat surface */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <AgentChatPanel workspaceId={workspaceId} featureId="" requestSessionId={channelId} useSubscriptionTransport />
        </div>
      </div>

      {/* Members side panel */}
      {membersOpen && (
        <aside className="w-64 shrink-0 border-l border-border">
          <ThreadMembersPanel threadId={channelId} workspaceId={workspaceId} />
        </aside>
      )}
    </div>
  );
}
