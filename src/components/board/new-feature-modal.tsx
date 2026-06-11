"use client";

import { ListBox, Modal, Select } from "@heroui/react";
import { AlertCircle, Plus, X } from "lucide-react";
import { useCallback, useState } from "react";

import type { ApiError } from "@/services/workflow-backend";
import { createFeature } from "@/services/workflow-backend";

const FEATURE_STAGES = [
  { value: "in_design", label: "In Design" },
  { value: "in_tdd", label: "In TDD" },
  { value: "ready_for_implementation", label: "Ready for Implementation" },
  { value: "in_implementation", label: "In Implementation" },
] as const;

type NewFeatureModalProps = {
  workspaceId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function NewFeatureModal({ workspaceId, onClose, onSuccess }: NewFeatureModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startStage, setStartStage] = useState<string>("in_design");
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
          ...(description.trim() ? { description: description.trim() } : {}),
          start_stage: startStage,
        });
        onSuccess?.();
        onClose();
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setSubmitting(false);
      }
    },
    [workspaceId, name, description, startStage, onSuccess, onClose],
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
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Description <span className="text-text-muted">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the feature"
                  disabled={submitting}
                  aria-label="Feature description"
                  rows={3}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Start Stage</label>
                <Select.Root selectedKey={startStage} onSelectionChange={(key) => setStartStage(String(key))} isDisabled={submitting} aria-label="Start stage" fullWidth>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {FEATURE_STAGES.map((stage) => (
                        <ListBox.Item key={stage.value} id={stage.value}>
                          {stage.label}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select.Root>
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
