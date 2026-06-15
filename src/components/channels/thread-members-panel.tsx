"use client";

import { Loader2, Minus, Plus, User, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { ChannelMember } from "@/services/hermes-agent/chat";
import { addThreadMember, listThreadMembers, removeThreadMember } from "@/services/hermes-agent/chat";
import type { WorkspaceMember } from "@/services/user-service";
import { listWorkspaceMembers } from "@/services/user-service";

type ThreadMembersPanelProps = {
  threadId: string;
  workspaceId: string;
};

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
      {initials || <User className="h-3.5 w-3.5" aria-hidden />}
    </div>
  );
}

export function ThreadMembersPanel({ threadId, workspaceId }: ThreadMembersPanelProps) {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [wsMembers, setWsMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [threadMems, wsMems] = await Promise.all([listThreadMembers(threadId), listWorkspaceMembers(workspaceId).catch(() => [] as WorkspaceMember[])]);
      setMembers(threadMems);
      setWsMembers(wsMems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [threadId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = useCallback(
    async (userId: string) => {
      setAddingId(userId);
      setError(null);
      try {
        await addThreadMember(threadId, userId);
        const ws = wsMembers.find((m) => m.user_id === userId);
        if (ws) {
          setMembers((prev) => [
            ...prev,
            {
              user_id: ws.user_id,
              display_name: ws.display_name,
              avatar_url: ws.avatar_url,
              role_label: ws.role,
            },
          ]);
        }
        setAddPickerOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add member");
      } finally {
        setAddingId(null);
      }
    },
    [threadId, wsMembers],
  );

  const handleRemove = useCallback(
    async (userId: string) => {
      setRemovingId(userId);
      setError(null);
      try {
        await removeThreadMember(threadId, userId);
        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove member");
      } finally {
        setRemovingId(null);
      }
    },
    [threadId],
  );

  const memberIds = new Set(members.map((m) => m.user_id));
  const addableCandidates = wsMembers.filter((m) => !memberIds.has(m.user_id));

  return (
    <div data-thread-members-panel className="flex h-full flex-col bg-surface">
      <div className="flex h-[52px] shrink-0 items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-text-muted" aria-hidden />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Members</span>
        </div>
        <button
          type="button"
          onClick={() => setAddPickerOpen((v) => !v)}
          aria-label="Add member"
          title="Add member"
          className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-white/10 hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-text-muted" aria-hidden />
        </div>
      )}

      {!loading && error && <div className="px-4 py-3 text-xs text-danger">{error}</div>}

      {!loading && !error && (
        <div className="flex-1 overflow-y-auto">
          {/* Add member picker */}
          {addPickerOpen && addableCandidates.length > 0 && (
            <div className="border-b border-border px-3 py-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Add from workspace</p>
              <ul className="flex flex-col gap-0.5">
                {addableCandidates.map((m) => (
                  <li key={m.user_id}>
                    <button
                      type="button"
                      onClick={() => void handleAdd(m.user_id)}
                      disabled={addingId === m.user_id}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary disabled:opacity-50"
                    >
                      <MemberAvatar name={m.display_name ?? m.user_id} />
                      <span className="flex-1 truncate">{m.display_name ?? m.user_id}</span>
                      {addingId === m.user_id ? <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden /> : <Plus className="h-3 w-3 shrink-0 opacity-50" aria-hidden />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Current members list */}
          {members.length === 0 && !addPickerOpen && <p className="px-4 py-3 text-xs text-text-muted">No members yet.</p>}
          <ul className="flex flex-col gap-0.5 px-2 py-2">
            {members.map((m) => (
              <li key={m.user_id}>
                <div className="group flex items-center gap-2 rounded px-2 py-1.5">
                  <MemberAvatar name={m.display_name ?? m.user_id} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-text-primary">{m.display_name ?? m.user_id}</div>
                    {m.role_label && <div className="truncate text-[10px] text-text-muted">{m.role_label}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemove(m.user_id)}
                    disabled={removingId === m.user_id}
                    aria-label={`Remove ${m.display_name ?? m.user_id}`}
                    title="Remove member"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                  >
                    {removingId === m.user_id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Minus className="h-3 w-3" aria-hidden />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
