"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

type CreateChannelModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<void>;
};

export function CreateChannelModal({ open, onClose, onCreate }: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setName("");
    setDescription("");
    setError(null);
    setSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) return;
      setSubmitting(true);
      setError(null);
      try {
        await onCreate(trimmedName, description.trim() || undefined);
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create channel");
        setSubmitting(false);
      }
    },
    [name, description, onCreate, reset],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-channel-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl">
        <h2 id="create-channel-title" className="mb-4 text-sm font-semibold text-text-primary">
          Create channel
        </h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="channel-name" className="text-xs font-medium text-text-secondary">
              Name{" "}
              <span aria-hidden className="text-danger">
                *
              </span>
            </label>
            <input
              id="channel-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. general"
              disabled={submitting}
              maxLength={80}
              autoFocus
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none disabled:opacity-50"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="channel-description" className="text-xs font-medium text-text-secondary">
              Description <span className="text-text-muted">(optional)</span>
            </label>
            <input
              id="channel-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              disabled={submitting}
              maxLength={200}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none disabled:opacity-50"
            />
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
              disabled={submitting || !name.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
