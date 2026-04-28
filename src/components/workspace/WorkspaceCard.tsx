"use client";

import { useRouter } from "next/navigation";
import { useWorkspace } from "@/context/workspace-context";
import type { WorkspaceSummary } from "@/types/workspace";

interface WorkspaceCardProps {
  workspace: WorkspaceSummary;
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const router = useRouter();
  const { setActiveWorkspaceId } = useWorkspace();

  function handleSelect() {
    setActiveWorkspaceId(workspace.workspaceId);
    router.push("/");
  }

  return (
    <button
      onClick={handleSelect}
      className="group flex w-full flex-col gap-4 rounded-[14px] border border-(--color-border) bg-(--color-surface) p-6 text-left shadow-sm transition-all hover:border-(--color-primary) hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary)"
    >
      {/* Workspace icon + name */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{
            background: "linear-gradient(135deg, #5465e8 0%, #6c7fff 100%)",
          }}
        >
          {workspace.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-(--color-text-primary) group-hover:text-(--color-primary)">
            {workspace.name}
          </p>
          <p className="font-mono truncate text-xs text-(--color-text-muted)">
            {workspace.workspaceId}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4">
        <Stat label="Features" value={workspace.totalFeatures} />
        <div className="h-3 w-px bg-(--color-border)" />
        <Stat
          label="In progress"
          value={workspace.inProgressFeatures}
          color="primary"
        />
        {workspace.blockedFeatures > 0 && (
          <>
            <div className="h-3 w-px bg-(--color-border)" />
            <Stat
              label="Blocked"
              value={workspace.blockedFeatures}
              color="danger"
            />
          </>
        )}
      </div>
    </button>
  );
}

interface StatProps {
  label: string;
  value: number;
  color?: "primary" | "danger";
}

function Stat({ label, value, color }: StatProps) {
  const valueClass =
    color === "primary"
      ? "text-(--color-primary)"
      : color === "danger"
        ? "text-(--color-danger)"
        : "text-(--color-text-primary)";

  return (
    <div className="flex flex-col">
      <span className={`text-lg font-semibold leading-none ${valueClass}`}>
        {value}
      </span>
      <span className="mt-0.5 text-xs text-(--color-text-muted)">{label}</span>
    </div>
  );
}
