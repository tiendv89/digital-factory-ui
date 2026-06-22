"use client";

import { Modal } from "@heroui/react";
import { AlertCircle, GitBranch, Plus, X } from "lucide-react";
import { useCallback, useState } from "react";

import type { ApiError } from "@/services/workflow-backend";
import { createFeature } from "@/services/workflow-backend";

export type OrchestratorOwner = "ts" | "go";

export const ORCHESTRATOR_OPTIONS: { value: OrchestratorOwner; label: string; description: string }[] = [
  { value: "ts", label: "TypeScript / Git", description: "Task state in YAML files on git branches" },
  { value: "go", label: "Postgres / Go", description: "Task state in the database" },
];

type NewFeatureModalProps = {
  workspaceId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function NewFeatureModal({ workspaceId, onClose, onSuccess }: NewFeatureModalProps) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState<OrchestratorOwner>("ts");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      setSubmitting(true);
      setError(null);
      try {
        await createFeature(workspaceId, {
          name: name.trim(),
          owner,
        });
        onSuccess?.();
        onClose();
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setSubmitting(false);
      }
    },
    [workspaceId, name, owner, onSuccess, onClose],
  );

  return (
    <Modal.Root
      isOpen
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Modal.Backdrop variant="opaque" isDismissable>
        <Modal.Container placement="center">
          <Modal.Dialog className="p-0 w-full max-w-md rounded-[13px] border border-border bg-surface shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-success" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-text-primary">New Feature</h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-secondary">
                <X className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. user-auth-revamp"
                  disabled={submitting}
                  aria-label="Feature name"
                  required
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                    Orchestrator Type
                  </span>
                </label>
                <div role="radiogroup" aria-label="Orchestrator type" className="flex flex-col gap-2">
                  {ORCHESTRATOR_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                        owner === opt.value ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-border hover:bg-surface-subtle"
                      } ${submitting ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <input
                        type="radio"
                        name="orchestrator-owner"
                        value={opt.value}
                        checked={owner === opt.value}
                        onChange={() => setOwner(opt.value)}
                        disabled={submitting}
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="text-xs font-medium text-text-primary">{opt.label}</span>
                        <span className="text-[11px] text-text-muted">{opt.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-danger-bg bg-danger-bg px-3 py-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                  <p className="text-xs text-danger">{error.message}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-subtle disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating&hellip;
                    </>
                  ) : (
                    "Create Feature"
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
