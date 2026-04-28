"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal, useOverlayState, Button } from "@heroui/react";
import { Plus, X } from "lucide-react";
import { initFeature } from "@/actions/init-feature";
import { useWorkspace } from "@/context/workspace-context";

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;

interface FormErrors {
  title?: string;
  featureId?: string;
  general?: string;
}

interface NewFeatureModalProps {
  existingFeatureIds?: string[];
}

export function NewFeatureModal({ existingFeatureIds = [] }: NewFeatureModalProps) {
  const state = useOverlayState();
  const { activeWorkspaceId } = useWorkspace();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [featureId, setFeatureId] = useState("");
  const [description, setDescription] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (!slugManuallyEdited) {
        setFeatureId(toSlug(value));
      }
      if (errors.title) setErrors((e) => ({ ...e, title: undefined }));
    },
    [slugManuallyEdited, errors.title],
  );

  const handleFeatureIdChange = useCallback(
    (value: string) => {
      setFeatureId(value);
      setSlugManuallyEdited(true);
      if (errors.featureId) setErrors((e) => ({ ...e, featureId: undefined }));
    },
    [errors.featureId],
  );

  function validate(): boolean {
    const next: FormErrors = {};

    if (!title.trim()) {
      next.title = "Feature name is required.";
    }

    if (!featureId.trim()) {
      next.featureId = "Feature ID is required.";
    } else if (!SLUG_PATTERN.test(featureId)) {
      next.featureId =
        "Feature ID must start with a letter and contain only lowercase letters, numbers, and hyphens.";
    } else if (existingFeatureIds.includes(featureId)) {
      next.featureId = `Feature ID "${featureId}" already exists.`;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function resetForm() {
    setTitle("");
    setFeatureId("");
    setDescription("");
    setSlugManuallyEdited(false);
    setErrors({});
  }

  function handleClose() {
    state.close();
    resetForm();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!activeWorkspaceId) {
      setErrors({ general: "No workspace selected." });
      return;
    }

    startTransition(async () => {
      const result = await initFeature({
        workspaceId: activeWorkspaceId,
        featureId,
        title: title.trim(),
        description: description.trim() || undefined,
      });

      if (!result.ok) {
        if (result.error?.includes("already exists")) {
          setErrors({ featureId: result.error });
        } else {
          setErrors({ general: result.error ?? "Failed to create feature." });
        }
        return;
      }

      handleClose();
      router.refresh();
    });
  }

  const isSubmitDisabled = !title.trim() || !featureId.trim() || isPending;

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onPress={state.open}
        className="flex items-center gap-1.5"
      >
        <Plus size={14} aria-hidden="true" />
        New Feature
      </Button>

      <Modal state={state}>
        <Modal.Backdrop isDismissable={!isPending}>
          <Modal.Container size="lg" placement="center">
            <Modal.Dialog>
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <Modal.Header className="flex items-start justify-between gap-4 border-b border-border px-6 pb-4 pt-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{
                        background:
                          "linear-gradient(135deg, #5465e8 0%, #6c7fff 100%)",
                      }}
                    >
                      <Plus size={16} aria-hidden="true" />
                    </div>
                    <div>
                      <Modal.Heading className="text-base font-semibold text-text-primary">
                        New Feature
                      </Modal.Heading>
                      <p className="text-xs text-text-muted">
                        Seed a feature at the start of the lifecycle
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Close modal"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </Modal.Header>

                {/* Body */}
                <Modal.Body className="flex flex-col gap-5 px-6 py-5">
                  {errors.general && (
                    <div className="rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger">
                      {errors.general}
                    </div>
                  )}

                  {/* Title field */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-sm font-medium text-text-primary"
                      htmlFor="new-feature-title"
                    >
                      Feature Name{" "}
                      <span className="text-danger" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      id="new-feature-title"
                      type="text"
                      placeholder="e.g. Agent Observability Dashboard"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      disabled={isPending}
                      autoFocus
                      className={[
                        "w-full rounded-lg border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted",
                        "bg-surface outline-none transition-colors",
                        "focus:border-primary focus:ring-2 focus:ring-primary/20",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        errors.title
                          ? "border-danger focus:border-danger focus:ring-danger/20"
                          : "border-border",
                      ].join(" ")}
                    />
                    {errors.title && (
                      <p className="text-xs text-danger">{errors.title}</p>
                    )}
                  </div>

                  {/* Feature ID field */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-sm font-medium text-text-primary"
                      htmlFor="new-feature-id"
                    >
                      Feature ID{" "}
                      <span className="text-danger" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      id="new-feature-id"
                      type="text"
                      value={featureId}
                      onChange={(e) => handleFeatureIdChange(e.target.value)}
                      disabled={isPending}
                      className={[
                        "w-full rounded-lg border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted",
                        "bg-surface font-mono outline-none transition-colors",
                        "focus:border-primary focus:ring-2 focus:ring-primary/20",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        errors.featureId
                          ? "border-danger focus:border-danger focus:ring-danger/20"
                          : "border-border",
                      ].join(" ")}
                    />
                    {errors.featureId ? (
                      <p className="text-xs text-danger">{errors.featureId}</p>
                    ) : (
                      <p className="text-xs text-text-muted">
                        Auto-generated from title. Click to customize.
                      </p>
                    )}
                  </div>

                  {/* Description field */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-sm font-medium text-text-primary"
                      htmlFor="new-feature-description"
                    >
                      Description
                    </label>
                    <textarea
                      id="new-feature-description"
                      rows={3}
                      placeholder="Brief summary of this feature"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isPending}
                      className={[
                        "w-full resize-none rounded-lg border border-border px-3 py-2 text-sm text-text-primary",
                        "bg-surface placeholder:text-text-muted outline-none transition-colors",
                        "focus:border-primary focus:ring-2 focus:ring-primary/20",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                      ].join(" ")}
                    />
                    <p className="text-xs text-text-muted">
                      Short summary shown on the feature list
                    </p>
                  </div>
                </Modal.Body>

                {/* Footer */}
                <Modal.Footer className="flex items-center justify-between gap-4 border-t border-border px-6 pb-5 pt-4">
                  <p className="text-xs text-text-muted">
                    Will create{" "}
                    <code className="rounded bg-bg px-1 py-0.5 font-mono text-text-secondary">
                      docs/features/{featureId || "<id>"}
                    </code>
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onPress={handleClose}
                      isDisabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isDisabled={isSubmitDisabled}
                    >
                      {isPending ? "Creating…" : "Create feature"}
                    </Button>
                  </div>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
