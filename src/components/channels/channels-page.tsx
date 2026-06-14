"use client";

import { Hash, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import type { ChannelSummary } from "@/services/hermes-agent/chat";
import { createChannel, deleteChannel, listChannels } from "@/services/hermes-agent/chat";
import { getCallerWorkspaceRole } from "@/services/user-service";

import { CreateChannelModal } from "./create-channel-modal";

export function ChannelsPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const router = useRouter();

  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const workspaceId = activeWorkspace?.id ?? "";

  const loadChannels = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listChannels(workspaceId);
      setChannels(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (!workspaceId) return;
    getCallerWorkspaceRole(workspaceId)
      .then((role) => setIsAdmin(role === "admin"))
      .catch(() => setIsAdmin(false));
  }, [workspaceId]);

  const handleCreate = useCallback(
    async (name: string, description?: string) => {
      if (!workspaceId) return;
      const channel = await createChannel(workspaceId, name, description);
      setChannels((prev) => [channel, ...prev]);
      setCreateOpen(false);
      router.push(`/channels/${channel.id}`);
    },
    [workspaceId, router],
  );

  const handleDelete = useCallback(async (channelId: string) => {
    setDeletingId(channelId);
    try {
      await deleteChannel(channelId);
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete channel");
    } finally {
      setDeletingId(null);
    }
  }, []);

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-muted">No workspace selected.</p>
      </div>
    );
  }

  return (
    <div data-channels-page className="flex h-full flex-col bg-bg">
      <header className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-border px-6">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-text-muted" aria-hidden />
          <h1 className="text-sm font-semibold text-text-primary">Channels</h1>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New channel
        </button>
      </header>

      <div className="flex-1 overflow-auto px-6 py-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" aria-hidden />
          </div>
        )}

        {error && !loading && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

        {!loading && !error && channels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Hash className="h-10 w-10 text-text-muted/40" aria-hidden />
            <p className="text-sm text-text-muted">No channels yet. Create one to get started.</p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-text-primary"
            >
              Create channel
            </button>
          </div>
        )}

        {!loading && channels.length > 0 && (
          <ul className="flex flex-col gap-1.5" role="list">
            {channels.map((channel) => (
              <li key={channel.id}>
                <div className="group flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-primary/30 hover:bg-surface-secondary">
                  <button type="button" onClick={() => router.push(`/channels/${channel.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Open channel ${channel.name}`}>
                    <Hash className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">{channel.name}</div>
                      {channel.description && <div className="truncate text-xs text-text-muted mt-0.5">{channel.description}</div>}
                    </div>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(channel.id);
                      }}
                      disabled={deletingId === channel.id}
                      aria-label={`Delete channel ${channel.name}`}
                      title="Delete channel (admin only)"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deletingId === channel.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateChannelModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </div>
  );
}
