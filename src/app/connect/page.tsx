"use client";

import { useRouter } from "next/navigation";
import { ConnectForm } from "@/features/workspaces/components/ConnectForm";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";

function WorkspaceList() {
  const router = useRouter();
  const { summaries, selectWorkspace, loadingWorkspace } =
    useWorkspaceContext();

  if (summaries.length === 0) return null;

  return (
    <section className="mt-10 w-full max-w-[680px]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">
          Imported workspaces
        </h2>
        <span className="text-xs text-text-muted">
          {summaries.length} total
        </span>
      </div>
      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="divide-y divide-border">
          {summaries.map((summary) => (
            <button
              key={summary.workspaceId}
              type="button"
              disabled={loadingWorkspace}
              onClick={() => {
                selectWorkspace(summary.workspaceId);
                router.push("/board");
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {summary.name}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {summary.repo_url}
                </p>
              </div>
              <span className="shrink-0 rounded border border-border bg-surface-subtle px-2 py-1 text-[11px] font-semibold text-text-secondary">
                Open
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ConnectPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-16">
      <ConnectForm />
      <WorkspaceList />
    </main>
  );
}
