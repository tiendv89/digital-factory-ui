"use client";

import { Modal } from "@heroui/react";
import { AlertCircle, Building2, X } from "lucide-react";
import { useCallback, useState } from "react";

import { useCreateOrg } from "@/hooks/workspaces/use-create-org";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type CreateOrgModalProps = {
  onClose: () => void;
  onSuccess?: () => void;
};

export function CreateOrgModal({ onClose, onSuccess }: CreateOrgModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const { mutate, isPending, error } = useCreateOrg();

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
          onSuccess: () => {
            onSuccess?.();
            onClose();
          },
        },
      );
    },
    [name, slug, mutate, onSuccess, onClose],
  );

  const errorMessage = error?.message ?? null;

  return (
    <Modal.Root
      isOpen
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Modal.Backdrop variant="opaque" isDismissable>
        <Modal.Container placement="center">
          <Modal.Dialog data-create-org-modal className="p-0 w-full max-w-md rounded-[13px] border border-border bg-surface shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-text-primary">Create Organization</h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted transition-colors hover:text-text-secondary">
                <X className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5">
              <div>
                <label htmlFor="org-name" className="mb-1 block text-xs font-medium text-text-secondary">
                  Organization name <span className="text-danger">*</span>
                </label>
                <input
                  id="org-name"
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Acme Corp"
                  disabled={isPending}
                  autoFocus
                  aria-label="Organization name"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="org-slug" className="mb-1 block text-xs font-medium text-text-secondary">
                  Slug <span className="text-danger">*</span>
                </label>
                <input
                  id="org-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="acme-corp"
                  disabled={isPending}
                  aria-label="Organization slug"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
                <p className="mt-1 text-[11px] text-text-muted">Used in URLs — lowercase letters, numbers, and hyphens only.</p>
              </div>

              {errorMessage && (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-danger-bg bg-danger-bg px-3 py-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
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
                  data-create-org-submit
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating&hellip;
                    </>
                  ) : (
                    "Create Organization"
                  )}
                </button>
              </div>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
