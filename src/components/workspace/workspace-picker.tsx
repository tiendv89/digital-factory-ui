import { WorkspaceCard } from "./workspace-card";
import type { WorkspaceSummary } from "@/types/workspace";

interface WorkspacePickerProps {
  workspaces: WorkspaceSummary[];
}

export function WorkspacePicker({ workspaces }: WorkspacePickerProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 py-16">
      <div className="w-full max-w-4xl">
        {/* Heading */}
        <div className="mb-10 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #5465e8 0%, #6c7fff 100%)",
            }}
          >
            DF
          </div>
          <h1 className="text-2xl font-semibold text-(--color-text-primary)">
            Select a workspace
          </h1>
          <p className="mt-1.5 text-sm text-(--color-text-secondary)">
            Choose a workspace to get started. Your selection will be remembered
            for future visits.
          </p>
        </div>

        {/* Workspace grid */}
        {workspaces.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-(--color-border) py-16 text-center">
            <p className="text-sm text-(--color-text-muted)">
              No workspaces found.
            </p>
            <p className="mt-1 text-xs text-(--color-text-muted)">
              Set <code className="font-mono">WORKSPACE_SCAN_ROOT</code> to a
              directory containing{" "}
              <code className="font-mono">workspace.yaml</code> files.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <WorkspaceCard key={ws.workspaceId} workspace={ws} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
