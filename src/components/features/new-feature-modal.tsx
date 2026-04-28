"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal, useOverlayState } from "@heroui/react";
import { Plus, X } from "lucide-react";
import { initFeature } from "@/actions/init-feature";
import { useWorkspace } from "@/context/workspace-context";
import type { WorkspaceRepo } from "@/types/workspace";

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
  repos?: WorkspaceRepo[];
}

export function NewFeatureModal({
  existingFeatureIds = [],
  repos = [],
}: NewFeatureModalProps) {
  const { activeWorkspaceId } = useWorkspace();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [featureId, setFeatureId] = useState("");
  const [description, setDescription] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());

  const resetForm = useCallback(() => {
    setTitle("");
    setFeatureId("");
    setDescription("");
    setSlugManuallyEdited(false);
    setErrors({});
    setSelectedRepos(new Set());
  }, []);


  const state = useOverlayState({
    onOpenChange: (open) => {
      if (!open) resetForm();
    },
  });

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

  function toggleRepo(repoId: string) {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) next.delete(repoId);
      else next.add(repoId);
      return next;
    });
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!title.trim()) next.title = "Feature name is required.";
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
      state.close();
      router.refresh();
    });
  }

  const isSubmitDisabled = !title.trim() || !featureId.trim() || isPending;

  return (
    <>
      <button
        type="button"
        onClick={state.open}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus size={14} aria-hidden="true" />
        New Feature
      </button>

      <Modal state={state}>
        <Modal.Backdrop isDismissable={!isPending}>
          <Modal.Container size="lg" placement="center">
            <Modal.Dialog className="max-w-160!">
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <Modal.Header className="border-b border-border">
                  <div className="flex items-center justify-between gap-4 px-6 py-[17px]">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, #5465e8 0%, #6c7fff 100%)",
                        }}
                      >
                        <Plus size={14} aria-hidden="true" />
                      </div>
                      <div>
                        <Modal.Heading className="text-[15px] font-semibold leading-tight text-text-primary">
                          New Feature
                        </Modal.Heading>
                        <p className="text-[11px] tracking-[0.065px] text-text-muted">
                          Seed a feature at the start of the lifecycle
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={state.close}
                      className="rounded p-0.5 text-text-muted transition-colors hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Close modal"
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                </Modal.Header>

                {/* Body */}
                <Modal.Body className="flex flex-col gap-5 px-6 pt-5 pb-1">
                  {errors.general && (
                    <div className="rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger">
                      {errors.general}
                    </div>
                  )}

                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="new-feature-title"
                        className="text-[11px] font-medium uppercase tracking-[0.5645px] text-text-muted"
                      >
                        Title <span className="text-danger">*</span>
                      </label>
                    </div>
                    <input
                      id="new-feature-title"
                      type="text"
                      placeholder="e.g. Agent Observability Dashboard"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      disabled={isPending}
                      autoFocus
                      className={[
                        "h-10 w-full rounded-lg border px-3 text-[14px] text-text-primary placeholder:text-text-muted",
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

                  {/* Feature ID */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="new-feature-id"
                        className="text-[11px] font-medium uppercase tracking-[0.5645px] text-text-muted"
                      >
                        Feature ID <span className="text-danger">*</span>
                      </label>
                      {!errors.featureId && (
                        <span className="text-[11px] tracking-[0.065px] text-text-muted">
                          Auto-generated from title. Click to customize.
                        </span>
                      )}
                    </div>
                    <input
                      id="new-feature-id"
                      type="text"
                      value={featureId}
                      onChange={(e) => handleFeatureIdChange(e.target.value)}
                      disabled={isPending}
                      className={[
                        "h-10 w-full rounded-lg border px-3 font-mono text-[13px] text-text-primary placeholder:text-text-muted",
                        "bg-surface outline-none transition-colors",
                        "focus:border-primary focus:ring-2 focus:ring-primary/20",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        errors.featureId
                          ? "border-danger focus:border-danger focus:ring-danger/20"
                          : "border-border",
                      ].join(" ")}
                    />
                    {errors.featureId && (
                      <p className="text-xs text-danger">{errors.featureId}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="new-feature-description"
                        className="text-[11px] font-medium uppercase tracking-[0.5645px] text-text-muted"
                      >
                        Description
                      </label>
                      <span className="text-[11px] tracking-[0.065px] text-text-muted">
                        Short summary shown on the feature list
                      </span>
                    </div>
                    <textarea
                      id="new-feature-description"
                      rows={3}
                      placeholder="Why this feature? What's the goal?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isPending}
                      className={[
                        "w-full resize-none rounded-lg border border-border px-3 py-2 text-[13px] text-text-primary",
                        "bg-surface placeholder:text-text-muted outline-none transition-colors",
                        "focus:border-primary focus:ring-2 focus:ring-primary/20",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                      ].join(" ")}
                    />
                  </div>

                  {/* Target Repos */}
                  {repos.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-[0.5645px] text-text-muted">
                          Target Repos
                        </span>
                        <span className="text-[11px] tracking-[0.065px] text-text-muted">
                          Select any repos this feature will touch
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {repos.map((repo) => {
                          const isSelected = selectedRepos.has(repo.id);
                          return (
                            <button
                              key={repo.id}
                              type="button"
                              onClick={() => toggleRepo(repo.id)}
                              className={[
                                "inline-flex h-7 items-center rounded-full border px-3 font-mono text-[12px] transition-colors",
                                isSelected
                                  ? "border-primary bg-primary-light text-primary"
                                  : "border-border bg-surface text-text-secondary hover:border-primary hover:text-primary",
                              ].join(" ")}
                            >
                              {repo.id}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Modal.Body>

                {/* Footer */}
                <Modal.Footer className="flex items-center justify-between gap-4 border-t border-border bg-surface-secondary px-6 py-4 mt-4">
                  <p className="text-[12px] text-text-muted">
                    Will create{" "}
                    <code className="rounded bg-bg px-1 font-mono text-[12px] text-text-primary">
                      docs/features/{featureId || "<id>"}
                    </code>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={state.close}
                      disabled={isPending}
                      className="h-9 rounded-lg border border-border px-4 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitDisabled}
                      className={[
                        "h-9 rounded-lg px-4 text-[13px] font-medium text-white transition-colors",
                        isSubmitDisabled
                          ? "cursor-not-allowed bg-border"
                          : "bg-primary hover:opacity-90",
                      ].join(" ")}
                    >
                      {isPending ? "Creating…" : "Create feature"}
                    </button>
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
