"use client";

import { Popover } from "@heroui/react";
import { Layers, Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { CreateWorkspaceModal } from "@/components/workspaces/create-workspace-modal";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { useDeleteWorkspace } from "@/hooks/workspaces/use-delete-workspace";

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

function WorkspaceRowMenu({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { removeWorkspace } = useWorkspaceContext();
  const deleteMutation = useDeleteWorkspace();

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setOpen(false);
    setConfirming(false);
    await deleteMutation.mutateAsync(workspaceId);
    removeWorkspace(workspaceId);
  };

  return (
    <Popover
      isOpen={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setConfirming(false);
      }}
    >
      <Popover.Trigger>
        <button
          type="button"
          disabled={deleteMutation.isPending}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors hover:bg-white/8 disabled:opacity-40"
          style={{ color: "#555" }}
          aria-label={`${workspaceName} options`}
        >
          {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MoreHorizontal className="h-4 w-4" aria-hidden />}
        </button>
      </Popover.Trigger>
      <Popover.Content placement="bottom end" className="p-0 overflow-hidden rounded-[8px] border border-border bg-surface shadow-lg" style={{ minWidth: 180 }}>
        <Popover.Dialog className="p-0 outline-none flex flex-col py-1">
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleteMutation.isPending}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-bg disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {confirming ? "Click again to confirm" : "Delete workspace"}
          </button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export function OrgWorkspacesTab({ orgId }: OrgWorkspacesTabProps) {
  const { summaries } = useWorkspaceContext();
  const workspaces = summaries.filter((s) => s.organization_id === orgId);
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
          {workspaces.map((ws) => (
            <div key={ws.id} className="flex items-center gap-4 rounded-[13px] border px-4 py-3.5" style={{ borderColor: "#3a3a3a", backgroundColor: "#232323" }} data-workspace-row={ws.id}>
              <WorkspaceIcon name={ws.name} id={ws.id} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-text-primary">{ws.name}</p>
              </div>
              <WorkspaceRowMenu workspaceId={ws.id} workspaceName={ws.name} />
            </div>
          ))}
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

      {creating && <CreateWorkspaceModal orgId={orgId} onClose={() => setCreating(false)} />}
    </div>
  );
}
