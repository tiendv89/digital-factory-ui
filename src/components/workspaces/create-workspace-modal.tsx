"use client";

import { Modal } from "@heroui/react";
import { AlertCircle, Check, Link2, X } from "lucide-react";
import { useCallback, useState } from "react";

import { Avatar, Button, cn, Field } from "@/components/common";
import { ICON_COLORS } from "@/components/settings/icon-colors";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { useCreateWorkspace } from "@/hooks/workspaces/use-create-workspace";
import { useOrgWorkspaceSelection } from "@/hooks/workspaces/use-org-workspace-selection";
import { getImportErrorMessage } from "@/utils/workspaces/import-error";

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

export function CreateWorkspaceModal({ onClose, onSuccess }: CreateWorkspaceModalProps) {
  const [mode, setMode] = useState<"create" | "import">("create");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [color, setColor] = useState<string>(ICON_COLORS[0]);
  const { mutate, isPending, error } = useCreateWorkspace();
  const { addWorkspace, importWorkspace, importingWorkspace, importError, clearImportError } = useWorkspaceContext();
  const { activeMembership } = useOrgWorkspaceSelection();

  const [repoUrl, setRepoUrl] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("");
  const [importName, setImportName] = useState("");

  const handleNameChange = useCallback(
    (v: string) => {
      setName(v);
      if (!slugEdited) setSlug(toSlug(v));
    },
    [slugEdited],
  );

  const handleSlugChange = useCallback((v: string) => {
    setSlugEdited(true);
    setSlug(toSlug(v));
  }, []);

  const handleRepoUrlChange = useCallback(
    (v: string) => {
      setRepoUrl(v);
      if (importError) clearImportError();
    },
    [importError, clearImportError],
  );

  const handleCreate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !slug.trim()) return;
      mutate(
        { name: name.trim(), slug: slug.trim(), organization_id: activeMembership?.organization_id },
        {
          onSuccess: (detail) => {
            addWorkspace(detail);
            onSuccess?.();
            onClose();
          },
        },
      );
    },
    [name, slug, mutate, addWorkspace, onSuccess, onClose, activeMembership?.organization_id],
  );

  const handleImport = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!repoUrl.trim()) return;
      try {
        await importWorkspace({
          repo_url: repoUrl.trim(),
          ...(defaultBranch.trim() ? { default_branch: defaultBranch.trim() } : {}),
          ...(importName.trim() ? { name: importName.trim() } : {}),
        });
        onSuccess?.();
        onClose();
      } catch {}
    },
    [repoUrl, defaultBranch, importName, importWorkspace, onSuccess, onClose],
  );

  const createErrorMessage = error?.message ?? null;
  const parsedImportError = importError ? getImportErrorMessage(importError) : null;

  const TABS = [
    { id: "create" as const, label: "Create" },
    { id: "import" as const, label: "Import" },
  ];

  return (
    <Modal.Root
      isOpen
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Modal.Backdrop variant="opaque" isDismissable>
        <Modal.Container placement="center">
          <Modal.Dialog
            data-create-workspace-modal
            className="p-0 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[13px] border border-border bg-surface shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-text-primary">{mode === "create" ? "Create Workspace" : "Import Workspace"}</h2>
                <div className="flex rounded-[6px] border border-border bg-surface-secondary p-0.5">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMode(tab.id)}
                      className={cn(
                        "rounded-[4px] px-2.5 py-0.5 text-xs font-medium transition-colors",
                        mode === tab.id ? "bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </header>

            {mode === "create" ? (
              <form onSubmit={handleCreate} noValidate className="space-y-5 overflow-y-auto p-5">
                {/* Name + avatar */}
                <div className="flex items-end gap-3">
                  <Avatar color={color} shape="square" size="lg">
                    {name.trim() ? undefined : "?"}
                  </Avatar>
                  <Field label="Workspace name" required className="flex-1">
                    <input
                      id="workspace-name"
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Platform Team"
                      disabled={isPending}
                      autoFocus
                      aria-label="Workspace name"
                      className="h-9 w-full rounded-[8px] border border-border-control bg-surface-secondary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    />
                  </Field>
                </div>

                {/* Icon color */}
                <Field label="Icon color">
                  <div className="flex flex-wrap gap-2">
                    {ICON_COLORS.map((c) => {
                      const selected = c === color;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          aria-label={`Icon color ${c}`}
                          aria-pressed={selected}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-[8px] transition-transform hover:scale-105",
                            selected && "ring-2 ring-white/80 ring-offset-2 ring-offset-surface",
                          )}
                          style={{ background: c }}
                        >
                          {selected && <Check className="h-3.5 w-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Slug */}
                <Field label="URL slug" required>
                  <div className="flex items-center rounded-[8px] border border-border-control bg-surface-secondary focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                    <span className="px-3 text-sm text-text-muted">/</span>
                    <input
                      id="workspace-slug"
                      type="text"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="my-workspace"
                      disabled={isPending}
                      aria-label="Workspace slug"
                      className="h-9 w-full rounded-r-[8px] bg-transparent pr-3 font-mono text-sm text-text-primary placeholder:text-text-muted outline-none disabled:opacity-50"
                    />
                  </div>
                </Field>

                {createErrorMessage && (
                  <div role="alert" className="flex items-start gap-2 rounded-[8px] border border-danger/40 bg-danger-bg px-3 py-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                    <p className="text-xs text-danger">{createErrorMessage}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={isPending || !name.trim() || !slug.trim()} loading={isPending} data-create-workspace-submit>
                    {isPending ? "Creating…" : "Create workspace"}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleImport} noValidate className="space-y-5 overflow-y-auto p-5">
                <Field label="Repository URL" required>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => handleRepoUrlChange(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    disabled={importingWorkspace}
                    autoFocus
                    aria-label="Repository URL"
                    aria-invalid={parsedImportError?.field === "repo_url" ? "true" : "false"}
                    className={cn(
                      "h-9 w-full rounded-[8px] border bg-surface-secondary px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50",
                      parsedImportError?.field === "repo_url" ? "border-danger focus:border-danger" : "border-border-control focus:border-primary",
                    )}
                  />
                  {parsedImportError?.field === "repo_url" && (
                    <p role="alert" className="mt-1 text-xs text-danger">
                      {parsedImportError.message}
                    </p>
                  )}
                </Field>

                <Field label="Default branch">
                  <input
                    type="text"
                    value={defaultBranch}
                    onChange={(e) => setDefaultBranch(e.target.value)}
                    placeholder="main"
                    disabled={importingWorkspace}
                    aria-label="Default branch"
                    className="h-9 w-full rounded-[8px] border border-border-control bg-surface-secondary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </Field>

                <Field label="Name">
                  <input
                    type="text"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    placeholder="My Workspace"
                    disabled={importingWorkspace}
                    aria-label="Workspace name"
                    className="h-9 w-full rounded-[8px] border border-border-control bg-surface-secondary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </Field>

                {parsedImportError && !parsedImportError.field && (
                  <div role="alert" className="flex items-start gap-2 rounded-[8px] border border-danger/40 bg-danger-bg px-3 py-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                    <p className="text-xs text-danger">{parsedImportError.message}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button type="button" variant="ghost" onClick={onClose} disabled={importingWorkspace}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={importingWorkspace || !repoUrl.trim()} loading={importingWorkspace}>
                    <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {importingWorkspace ? "Importing…" : "Import workspace"}
                  </Button>
                </div>
              </form>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
