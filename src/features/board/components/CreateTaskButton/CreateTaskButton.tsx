"use client";

import { AlertCircle, ExternalLink, Plus, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

export function CreateTaskDialog({
  open,
  onClose,
  workspaceName,
}: {
  open: boolean;
  onClose: () => void;
  workspaceName: string;
}) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={
        "fixed inset-0 z-40 " +
        (open ? "pointer-events-auto" : "pointer-events-none")
      }
    >
      <button
        type="button"
        aria-label="Close create task dialog"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={
          "absolute inset-0 cursor-default bg-black/80 transition-opacity duration-200 " +
          (open ? "opacity-100" : "opacity-0")
        }
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={
          "absolute right-0 top-0 flex h-full w-full flex-col bg-surface shadow-xl transition-transform duration-200 ease-out " +
          "sm:max-w-md md:max-w-lg lg:max-w-xl " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-border bg-surface px-6 py-5">
            <div className="flex min-w-0 flex-col gap-3">
              <h2
                id={titleId}
                className="text-xl font-semibold leading-snug text-text-primary"
              >
                Create Task
              </h2>
              <p className="text-sm text-text-secondary">
                Task creation requires a backend write endpoint that is not yet
                available.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 p-1 text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-3 rounded border border-warning/40 bg-warning/10 p-4">
                <AlertCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-warning"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-semibold text-warning">
                    Backend Dependency Required
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    The frontend does not have a task creation write contract.
                    The workflow backend must expose a{" "}
                    <code className="rounded bg-chip-bg px-1 text-xs">
                      POST /api/workspaces/:workspaceId/tasks
                    </code>{" "}
                    endpoint before the UI can submit new tasks.
                  </p>
                </div>
              </div>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-text-primary">
                  How to Create Tasks Today
                </h3>
                <p className="text-sm text-text-secondary">
                  Tasks are currently created by editing YAML files in the
                  management repository. Add a task entry under{" "}
                  <code className="rounded bg-chip-bg px-1 text-xs">
                    docs/features/&lt;feature&gt;/tasks.md
                  </code>{" "}
                  and sync the workspace to see it appear on the board.
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-text-primary">
                  What the Backend Needs
                </h3>
                <ul className="list-inside list-disc space-y-2 text-sm text-text-secondary">
                  <li>
                    A{" "}
                    <code className="rounded bg-chip-bg px-1 text-xs">
                      POST /api/workspaces/:workspaceId/tasks
                    </code>{" "}
                    endpoint that accepts a task payload.
                  </li>
                  <li>
                    The payload should include:{" "}
                    <code className="rounded bg-chip-bg px-1 text-xs">
                      task_id
                    </code>
                    ,{" "}
                    <code className="rounded bg-chip-bg px-1 text-xs">
                      title
                    </code>
                    ,{" "}
                    <code className="rounded bg-chip-bg px-1 text-xs">
                      feature_id
                    </code>
                    ,{" "}
                    <code className="rounded bg-chip-bg px-1 text-xs">
                      repo
                    </code>
                    , and{" "}
                    <code className="rounded bg-chip-bg px-1 text-xs">
                      description
                    </code>
                    .
                  </li>
                  <li>
                    A corresponding frontend client function (e.g.{" "}
                    <code className="rounded bg-chip-bg px-1 text-xs">
                      createTask
                    </code>{" "}
                    in{" "}
                    <code className="rounded bg-chip-bg px-1 text-xs">
                      src/services/workflow-backend/client.ts
                    </code>
                    ) should wrap the API call.
                  </li>
                </ul>
              </section>

              <section className="border-t border-border pt-6" id={descId}>
                <h3 className="mb-2 text-sm font-semibold text-text-primary">
                  Workspace
                </h3>
                <p className="text-sm text-text-secondary">
                  {workspaceName}
                </p>
                <p className="mt-4 text-xs text-text-muted">
                  Once the backend write contract is available, this dialog will
                  be replaced with a full task creation form.
                </p>
              </section>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function CreateTaskButton({
  workspaceName,
}: {
  workspaceName: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="flex h-8 items-center gap-1.5 border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-subtle"
        aria-label="Create new task"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Create Task
      </button>
      <CreateTaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        workspaceName={workspaceName}
      />
    </>
  );
}
