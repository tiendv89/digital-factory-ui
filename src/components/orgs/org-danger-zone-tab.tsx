"use client";

import { ListBox, Select } from "@heroui/react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button, Input } from "@/components/common";
import { useDeleteOrg, useOrgMembers, useTransferOrgOwnership } from "@/hooks/admin/use-org-settings";
import type { OrgRole } from "@/services/user-service";

interface OrgDangerZoneTabProps {
  orgId: string;
  orgName: string;
  currentUserId: string;
  userRole: OrgRole;
  onOrgDeleted?: () => void;
}

export function OrgDangerZoneTab({ orgId, orgName, currentUserId, userRole, onOrgDeleted }: OrgDangerZoneTabProps) {
  const { members } = useOrgMembers(orgId);
  const transferOwnership = useTransferOrgOwnership(orgId);
  const deleteOrgMutation = useDeleteOrg(orgId);

  const [transferUserId, setTransferUserId] = useState("");
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canEdit = userRole === "admin";

  const eligibleForTransfer = members.filter((m) => m.user_id !== currentUserId);

  const handleTransfer = async () => {
    setTransferError(null);
    if (!transferUserId) {
      setTransferError("Select a member to transfer ownership to.");
      return;
    }
    if (!transferConfirm) {
      setTransferConfirm(true);
      return;
    }
    try {
      await transferOwnership.mutateAsync({ new_owner_user_id: transferUserId });
      setTransferConfirm(false);
      setTransferUserId("");
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : "Transfer failed");
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    if (deleteConfirmText !== orgName) {
      setDeleteError(`Type "${orgName}" to confirm deletion.`);
      return;
    }
    try {
      await deleteOrgMutation.mutateAsync();
      onOrgDeleted?.();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Deletion failed");
    }
  };

  if (!canEdit) {
    return (
      <div className="py-8 text-center text-sm text-text-muted" data-org-danger-read-only>
        <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-warning" aria-hidden />
        <p>Danger zone actions require admin access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-org-danger-zone>
      {/* Delete org */}
      <section aria-labelledby="org-delete-heading" className="rounded-[13px] border border-danger/40 bg-danger-bg/40 p-4" data-org-delete-section>
        <h3 id="org-delete-heading" className="mb-1 flex items-center gap-2 text-sm font-semibold text-danger">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Delete organization
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-text-secondary">
          This permanently deletes <strong className="text-text-primary">{orgName}</strong> and all its workspaces, features, tasks, and agent sessions. This action cannot be undone.
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="delete-confirm-text" className="mb-1.5 block text-xs text-text-secondary">
              Type <span className="font-mono font-semibold text-danger">{orgName}</span> to confirm
            </label>
            <Input
              id="delete-confirm-text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteError(null);
              }}
              placeholder={orgName}
              aria-label={`Type ${orgName} to confirm deletion`}
              className="font-mono focus:border-danger focus:ring-danger"
            />
          </div>
          <Button
            variant="danger"
            onClick={() => void handleDelete()}
            disabled={deleteOrgMutation.isPending || deleteConfirmText !== orgName}
            loading={deleteOrgMutation.isPending}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            aria-label="Delete organisation permanently"
          >
            Delete organization
          </Button>
          {(deleteError || deleteOrgMutation.error) && (
            <p className="text-xs text-danger" role="alert">
              {deleteError ?? deleteOrgMutation.error?.message}
            </p>
          )}
        </div>
      </section>

      {/* Transfer ownership */}
      <section aria-labelledby="org-transfer-heading" className="rounded-[13px] border border-border bg-surface p-4">
        <h3 id="org-transfer-heading" className="mb-1 text-sm font-semibold text-text-primary">
          Transfer ownership
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-text-secondary">
          Transfer admin ownership of this organisation to another member. You will retain your current admin role unless the new owner changes it.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select.Root
            selectedKey={transferUserId || null}
            onSelectionChange={(key) => {
              setTransferUserId(key ? String(key) : "");
              setTransferConfirm(false);
              setTransferError(null);
            }}
            placeholder="Select member…"
            aria-label="Select member to transfer ownership to"
            className="flex-1"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {eligibleForTransfer.map((m) => (
                  <ListBox.Item key={m.user_id} id={m.user_id}>
                    {m.display_name ?? m.email}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select.Root>
          <Button
            variant={transferConfirm ? "primary" : "secondary"}
            onClick={() => void handleTransfer()}
            disabled={transferOwnership.isPending || !transferUserId}
            loading={transferOwnership.isPending}
            aria-label={transferConfirm ? "Confirm transfer ownership" : "Transfer ownership"}
          >
            {transferConfirm ? "Confirm transfer" : "Transfer ownership"}
          </Button>
        </div>
        {(transferError || transferOwnership.error) && (
          <p className="mt-2 text-xs text-danger" role="alert">
            {transferError ?? transferOwnership.error?.message}
          </p>
        )}
      </section>
    </div>
  );
}
