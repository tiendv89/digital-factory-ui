"use client";

import { AlertCircle, Link2, X } from "lucide-react";
import { useCallback, useState } from "react";

import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { getImportErrorMessage } from "@/utils/workspaces/import-error";

type ImportModalProps = {
  onClose: () => void;
  onSuccess?: () => void;
};

export function ImportModal({ onClose, onSuccess }: ImportModalProps) {
  const { importWorkspace, importingWorkspace, importError, clearImportError } = useWorkspaceContext();

  const [repoUrl, setRepoUrl] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("");
  const [name, setName] = useState("");

  const parsedError = importError ? getImportErrorMessage(importError) : null;

  const handleRepoUrlChange = useCallback(
    (v: string) => {
      setRepoUrl(v);
      if (importError) clearImportError();
    },
    [importError, clearImportError],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!repoUrl.trim()) return;

      try {
        await importWorkspace({
          repo_url: repoUrl.trim(),
          ...(defaultBranch.trim() ? { default_branch: defaultBranch.trim() } : {}),
          ...(name.trim() ? { name: name.trim() } : {}),
        });
        onSuccess?.();
        onClose();
      } catch {
        // error is already set in context, keep modal open
      }
    },
    [repoUrl, defaultBranch, name, importWorkspace, onSuccess, onClose],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import workspace"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-surface shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-success" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-text-primary">Import Workspace</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-secondary">
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Repository URL <span className="text-danger">*</span>
            </label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => handleRepoUrlChange(e.target.value)}
              placeholder="https://github.com/owner/repo"
              disabled={importingWorkspace}
              aria-label="Repository URL"
              aria-invalid={parsedError?.field === "repo_url" ? "true" : "false"}
              className={
                "w-full rounded-md border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 " +
                (parsedError?.field === "repo_url" ? "border-danger focus:border-danger" : "border-border focus:border-primary")
              }
            />
            {parsedError?.field === "repo_url" && (
              <p role="alert" className="mt-1 text-xs text-danger">
                {parsedError.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Default Branch <span className="text-text-muted">(optional)</span>
            </label>
            <input
              type="text"
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
              placeholder="main"
              disabled={importingWorkspace}
              aria-label="Default branch"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Name <span className="text-text-muted">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workspace"
              disabled={importingWorkspace}
              aria-label="Workspace name"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
          </div>

          {parsedError && !parsedError.field && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-danger-bg bg-danger-bg px-3 py-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
              <p className="text-xs text-danger">{parsedError.message}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={importingWorkspace}
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-subtle disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={importingWorkspace || !repoUrl.trim()}
              className="flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importingWorkspace ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Importing&hellip;
                </>
              ) : (
                "Import"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
