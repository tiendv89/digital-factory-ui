"use client";

import { Layers, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";

import { CreateWorkspaceModal } from "@/components/workspaces/create-workspace-modal";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";

import { deriveIconColor } from "../settings/icon-colors";

interface OrgWorkspacesTabProps {
  orgId: string;
}

function WorkspaceIcon({ name, id }: { name: string; id: string }) {
  const initial = (name?.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center font-bold text-white"
      style={{ width: 44, height: 44, fontSize: 18, borderRadius: 10, background: deriveIconColor(id) }}
    >
      {initial}
    </span>
  );
}

export function OrgWorkspacesTab({ orgId: _orgId }: OrgWorkspacesTabProps) {
  const { summaries: workspaces } = useWorkspaceContext();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-3" data-org-workspaces>
      <p className="text-sm" style={{ color: "#8a8a8a" }}>
        {workspaces.length} {workspaces.length === 1 ? "workspace" : "workspaces"} in this organization
      </p>

      {workspaces.length === 0 ? (
        <div className="rounded-[13px] border py-12 text-center" style={{ borderColor: "#3a3a3a" }}>
          <Layers className="mx-auto mb-2 h-6 w-6 text-text-muted" aria-hidden />
          <p className="text-sm text-text-muted">No workspaces in this organisation.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2" data-workspaces-list>
          {workspaces.map((ws) => {
            return (
              <div key={ws.id} className="flex items-center gap-4 rounded-[13px] border px-4 py-3.5" style={{ borderColor: "#3a3a3a", backgroundColor: "#232323" }} data-workspace-row={ws.id}>
                <WorkspaceIcon name={ws.name} id={ws.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-text-primary">{ws.name}</p>
                </div>
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors hover:bg-white/8"
                  style={{ color: "#555" }}
                  aria-label={`${ws.name} options`}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] border py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
        style={{ borderColor: "#3a3a3a", color: "#8a8a8a" }}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        New workspace
      </button>

      {creating && <CreateWorkspaceModal onClose={() => setCreating(false)} />}
    </div>
  );
}
