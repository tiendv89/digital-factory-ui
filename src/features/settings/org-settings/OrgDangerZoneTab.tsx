"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, Skull } from "lucide-react";
import {
  useOrgMembers,
  useTransferOrgOwnership,
  useDeleteOrg,
} from "@/features/admin/hooks/useOrgSettings";
import type { OrgRole } from "@/services/user-service";

interface OrgDangerZoneTabProps {
  orgId: string;
  orgName: string;
  currentUserId: string;
  userRole: OrgRole;
  onOrgDeleted?: () => void;
}

export function OrgDangerZoneTab({
  orgId,
  orgName,
  currentUserId,
  userRole,
  onOrgDeleted,
}: OrgDangerZoneTabProps) {
  const { members } = useOrgMembers(orgId);
  const transferOwnership = useTransferOrgOwnership(orgId);
  const deleteOrgMutation = useDeleteOrg(orgId);

  const [transferUserId, setTransferUserId] = useState("");
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canEdit = userRole === "admin" || userRole === "platform_admin";

  const eligibleForTransfer = members.filter(
    (m) => m.user_id !== currentUserId && m.role !== "platform_admin",
  );

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
    <div className="space-y-6" data-org-danger-zone>
      {/* Transfer ownership */}
      <section
        aria-labelledby="org-transfer-heading"
        className="rounded-lg border border-warning/30 bg-warning-bg/30 p-4"
      >
        <h3
          id="org-transfer-heading"
          className="mb-1 flex items-center gap-2 text-sm font-semibold text-warning"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Transfer ownership
        </h3>
        <p className="mb-4 text-xs text-text-muted">
          Transfer admin ownership of this organisation to another member. You will retain your
          current admin role unless the new owner changes it.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={transferUserId}
            onChange={(e) => {
              setTransferUserId(e.target.value);
              setTransferConfirm(false);
              setTransferError(null);
            }}
            aria-label="Select member to transfer ownership to"
            className="flex-1 rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Select member…</option>
            {eligibleForTransfer.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name ?? m.email}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleTransfer()}
            disabled={transferOwnership.isPending || !transferUserId}
            aria-label={
              transferConfirm ? "Confirm transfer ownership" : "Transfer ownership"
            }
            className={
              "flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
              (transferConfirm
                ? "border-warning/40 bg-warning-bg text-warning hover:bg-warning/20"
                : "border-border bg-surface-secondary text-text-secondary hover:bg-nav-item-hover hover:text-text-primary")
            }
          >
            {transferOwnership.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : null}
            {transferConfirm ? "Confirm transfer" : "Transfer"}
          </button>
        </div>
        {transferError && (
          <p className="mt-2 text-xs text-danger" role="alert">
            {transferError}
          </p>
        )}
        {transferOwnership.error && (
          <p className="mt-2 text-xs text-danger" role="alert">
            {transferOwnership.error.message}
          </p>
        )}
      </section>

      {/* Delete org */}
      <section
        aria-labelledby="org-delete-heading"
        className="rounded-lg border border-danger/30 bg-danger-bg/30 p-4"
        data-org-delete-section
      >
        <h3
          id="org-delete-heading"
          className="mb-1 flex items-center gap-2 text-sm font-semibold text-danger"
        >
          <Skull className="h-4 w-4" aria-hidden />
          Delete organisation
        </h3>
        <p className="mb-4 text-xs text-text-muted">
          Permanently delete <strong className="text-text-primary">{orgName}</strong> and all its
          data. This action is irreversible.
        </p>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="delete-confirm-text"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              Type <span className="font-mono font-bold text-text-primary">{orgName}</span> to
              confirm
            </label>
            <input
              id="delete-confirm-text"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteError(null);
              }}
              placeholder={orgName}
              aria-label={`Type ${orgName} to confirm deletion`}
              className="w-full rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-danger focus:ring-1 focus:ring-danger"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={
              deleteOrgMutation.isPending || deleteConfirmText !== orgName
            }
            aria-label="Delete organisation permanently"
            className="flex items-center gap-1.5 rounded border border-danger/40 bg-danger-bg px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            {deleteOrgMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Skull className="h-3.5 w-3.5" aria-hidden />
            )}
            Delete organisation
          </button>
          {deleteError && (
            <p className="text-xs text-danger" role="alert">
              {deleteError}
            </p>
          )}
          {deleteOrgMutation.error && (
            <p className="text-xs text-danger" role="alert">
              {deleteOrgMutation.error.message}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
