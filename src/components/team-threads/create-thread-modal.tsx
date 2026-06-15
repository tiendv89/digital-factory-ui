"use client";

import { Loader2, User, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { WorkspaceMember } from "@/services/user-service";
import { listWorkspaceMembers } from "@/services/user-service";

type CreateThreadModalProps = {
  open: boolean;
  workspaceId: string;
  onClose: () => void;
  onCreate: (title?: string, members?: string[]) => Promise<void>;
};

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">{initials || <User className="h-3 w-3" aria-hidden />}</div>
  );
}

export function CreateThreadModal({ open, workspaceId, onClose, onCreate }: CreateThreadModalProps) {
  const [title, setTitle] = useState("");
  const [wsMembers, setWsMembers] = useState<WorkspaceMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !workspaceId) return;
    setLoadingMembers(true);
    listWorkspaceMembers(workspaceId)
      .then((members) => setWsMembers(members))
      .catch(() => setWsMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [open, workspaceId]);

  const reset = useCallback(() => {
    setTitle("");
    setSelectedIds(new Set());
    setError(null);
    setSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const toggleMember = useCallback((userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);
      try {
        const trimmedTitle = title.trim() || undefined;
        const members = selectedIds.size > 0 ? [...selectedIds] : undefined;
        await onCreate(trimmedTitle, members);
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create thread");
        setSubmitting(false);
      }
    },
    [title, selectedIds, onCreate, reset],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-thread-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="create-thread-title" className="text-sm font-semibold text-text-primary">
            New team thread
          </h2>
          <button type="button" onClick={handleClose} aria-label="Close" className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:text-text-primary">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="thread-title" className="text-xs font-medium text-text-secondary">
              Title <span className="text-text-muted">(optional)</span>
            </label>
            <input
              id="thread-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. API design discussion"
              disabled={submitting}
              maxLength={120}
              autoFocus
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Member selection */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-text-secondary">
              Add members <span className="text-text-muted">(optional)</span>
            </p>
            {loadingMembers ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" aria-hidden />
                <span className="text-xs text-text-muted">Loading members…</span>
              </div>
            ) : wsMembers.length === 0 ? (
              <p className="text-xs text-text-muted">No workspace members found.</p>
            ) : (
              <ul className="max-h-40 overflow-y-auto rounded-md border border-border bg-bg">
                {wsMembers.map((m) => {
                  const selected = selectedIds.has(m.user_id);
                  return (
                    <li key={m.user_id}>
                      <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-surface-secondary">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMember(m.user_id)}
                          disabled={submitting}
                          className="h-3.5 w-3.5 accent-primary"
                          aria-label={`Add ${m.display_name ?? m.user_id}`}
                        />
                        <MemberAvatar name={m.display_name ?? m.user_id} />
                        <span className="flex-1 truncate text-xs text-text-primary">{m.display_name ?? m.user_id}</span>
                        <span className="shrink-0 text-[10px] text-text-muted">{m.role}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            {selectedIds.size > 0 && (
              <p className="text-[10px] text-text-muted">
                {selectedIds.size} member{selectedIds.size === 1 ? "" : "s"} selected
              </p>
            )}
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-text-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              Create thread
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
