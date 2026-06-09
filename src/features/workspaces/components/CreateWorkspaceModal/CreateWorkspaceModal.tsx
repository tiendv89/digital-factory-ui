"use client";

import { useCallback, useState } from "react";
import { Layers, X, AlertCircle } from "lucide-react";
import { useCreateWorkspace } from "@/features/workspaces/hooks/useCreateWorkspace";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { buildImportLocalSummary } from "@/features/workspaces/lib/workspaceAdapter";
import {
  saveLocalWorkspaceSummary,
  setSelectedWorkspaceId,
} from "@/services/local-workspace-store";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type CreateWorkspaceModalProps = {
  onClose: () => void;
  onSuccess?: () => void;
};

export function CreateWorkspaceModal({
  onClose,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const { mutate, isPending, error } = useCreateWorkspace();
  const { selectWorkspace } = useWorkspaceContext();

  const handleNameChange = useCallback(
    (v: string) => {
      setName(v);
      if (!slugEdited) {
        setSlug(toSlug(v));
      }
    },
    [slugEdited],
  );

  const handleSlugChange = useCallback((v: string) => {
    setSlugEdited(true);
    setSlug(toSlug(v));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !slug.trim()) return;
      mutate(
        { name: name.trim(), slug: slug.trim() },
        {
          onSuccess: (detail) => {
            // Persist the new workspace locally and select it.
            const summary = buildImportLocalSummary(
              detail,
              { repo_url: "", name: detail.name },
              new Date().toISOString(),
            );
            saveLocalWorkspaceSummary(summary);
            setSelectedWorkspaceId(detail.id);
            selectWorkspace(detail.id);
            onSuccess?.();
            onClose();
          },
        },
      );
    },
    [name, slug, mutate, selectWorkspace, onSuccess, onClose],
  );

  const errorMessage = error?.message ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create workspace"
      data-create-workspace-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-surface shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-success" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-text-primary">
              Create Workspace
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted transition-colors hover:text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5">
          <div>
            <label
              htmlFor="workspace-name"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Workspace name <span className="text-danger">*</span>
            </label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Workspace"
              disabled={isPending}
              autoFocus
              aria-label="Workspace name"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="workspace-slug"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Slug <span className="text-danger">*</span>
            </label>
            <input
              id="workspace-slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="my-workspace"
              disabled={isPending}
              aria-label="Workspace slug"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
            <p className="mt-1 text-[11px] text-text-muted">
              Used in URLs — lowercase letters, numbers, and hyphens only.
            </p>
          </div>

          <div className="rounded-md border border-border bg-surface-secondary px-3 py-2">
            <p className="text-[11px] text-text-muted">
              <span className="font-medium text-text-secondary">
                Color & plan
              </span>{" "}
              — available in a future release.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger-bg bg-danger-bg px-3 py-2"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-danger"
                aria-hidden="true"
              />
              <p className="text-xs text-danger">{errorMessage}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-subtle disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim() || !slug.trim()}
              data-create-workspace-submit
              className="flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating&hellip;
                </>
              ) : (
                "Create Workspace"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
