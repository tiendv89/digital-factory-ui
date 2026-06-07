"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  Select,
  Spinner,
  Table,
} from "@heroui/react";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import {
  useWorkspaceMembers,
  useWorkspaceInvitations,
  useInviteMember,
  useRemoveMember,
  useCancelInvitation,
} from "@/features/admin/hooks/useAdminMembers";
import type { Member, Invitation } from "@/services/user-service";

function MembersTable({
  workspaceId,
  members,
  loading,
  error,
}: {
  workspaceId: string;
  members: Member[];
  loading: boolean;
  error: Error | null;
}) {
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const removeMutation = useRemoveMember(workspaceId);
  const member = members.find((m) => m.user_id === confirmUserId);

  function handleOpenConfirm(userId: string) {
    removeMutation.reset();
    setConfirmUserId(userId);
  }

  function handleConfirmRemove() {
    if (!confirmUserId) return;
    removeMutation.mutate(confirmUserId, {
      onSuccess: () => setConfirmUserId(null),
    });
  }

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">Members</h2>
        {loading && <Spinner size="sm" />}
      </div>

      {error && (
        <div className="px-5 py-3">
          <Alert status="danger">
            <Alert.Content>
              <Alert.Description>
                Failed to load members: {error.message}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}

      {!error && (
        <div className="overflow-x-auto">
          <Table.Content
            aria-label="Members"
            className="w-full text-sm"
          >
            <Table.Header>
              <Table.Column
                id="name"
                isRowHeader
                className="border-b border-border bg-surface-subtle px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                Name
              </Table.Column>
              <Table.Column
                id="email"
                className="border-b border-border bg-surface-subtle px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                Email
              </Table.Column>
              <Table.Column
                id="role"
                className="border-b border-border bg-surface-subtle px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                Role
              </Table.Column>
              <Table.Column
                id="actions"
                className="border-b border-border bg-surface-subtle px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                Actions
              </Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() =>
                loading ? null : (
                  <div className="py-8 text-center text-sm text-text-muted">
                    No members found.
                  </div>
                )
              }
            >
              {members.map((m) => (
                <Table.Row
                  key={m.user_id}
                  id={m.user_id}
                  className="border-b border-border last:border-0 hover:bg-surface-subtle"
                >
                  <Table.Cell className="px-5 py-3 font-medium text-text-primary">
                    {m.display_name ?? "—"}
                  </Table.Cell>
                  <Table.Cell className="px-5 py-3 text-text-secondary">
                    {m.email}
                  </Table.Cell>
                  <Table.Cell className="px-5 py-3">
                    <span className="rounded-full border border-border bg-chip-bg px-2 py-0.5 text-xs font-medium text-text-secondary capitalize">
                      {m.role}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="px-5 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-danger/40 text-danger hover:bg-danger-bg"
                      onPress={() => handleOpenConfirm(m.user_id)}
                    >
                      Remove
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </div>
      )}

      <Modal
        isOpen={confirmUserId !== null && member !== undefined}
        onOpenChange={(open) => {
          if (!open) setConfirmUserId(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Remove member</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-text-secondary">
                  Remove {member?.display_name ?? member?.email} from this
                  workspace? They will lose access immediately.
                </p>
                {removeMutation.isError && (
                  <Alert status="danger" className="mt-4">
                    <Alert.Content>
                      <Alert.Description>
                        {removeMutation.error?.message ??
                          "Failed to remove member."}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="outline"
                  onPress={() => setConfirmUserId(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={handleConfirmRemove}
                  isDisabled={removeMutation.isPending}
                >
                  {removeMutation.isPending ? "Removing…" : "Remove"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </section>
  );
}

function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const inviteMutation = useInviteMember(workspaceId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate(
      { email: email.trim(), role },
      {
        onSuccess: () => {
          setEmail("");
          setRole("member");
        },
      },
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Invite a new member
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
        {inviteMutation.isError && (
          <Alert status="danger">
            <Alert.Content>
              <Alert.Description>
                Failed to send invite:{" "}
                {inviteMutation.error?.message ?? "Unknown error"}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}
        {inviteMutation.isSuccess && (
          <Alert status="success">
            <Alert.Content>
              <Alert.Description>
                Invitation created successfully.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}
        <div className="flex flex-col gap-1">
          <Label htmlFor="invite-email" className="text-xs font-medium text-text-secondary">
            Email address
          </Label>
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="invite-role" className="text-xs font-medium text-text-secondary">
            Role
          </Label>
          <Select
            selectedKey={role}
            onSelectionChange={(key) =>
              setRole(key as "member" | "admin")
            }
            aria-label="Role"
          >
            <Select.Trigger id="invite-role">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBoxItem id="member">Member</ListBoxItem>
                <ListBoxItem id="admin">Admin</ListBoxItem>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            isDisabled={inviteMutation.isPending || !email.trim()}
          >
            {inviteMutation.isPending ? "Sending…" : "Invite"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function InvitationsTable({
  workspaceId,
  invitations,
  loading,
  error,
}: {
  workspaceId: string;
  invitations: Invitation[];
  loading: boolean;
  error: Error | null;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const cancelMutation = useCancelInvitation(workspaceId);
  const invitation = invitations.find((inv) => inv.id === confirmId);

  function handleOpenConfirm(invId: string) {
    cancelMutation.reset();
    setConfirmId(invId);
  }

  function handleConfirmCancel() {
    if (!confirmId) return;
    cancelMutation.mutate(confirmId, {
      onSuccess: () => setConfirmId(null),
    });
  }

  function formatExpiry(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Pending invitations
        </h2>
        {loading && <Spinner size="sm" />}
      </div>

      {error && (
        <div className="px-5 py-3">
          <Alert status="danger">
            <Alert.Content>
              <Alert.Description>
                Failed to load invitations: {error.message}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}

      {!error && (
        <div className="overflow-x-auto">
          <Table.Content
            aria-label="Pending invitations"
            className="w-full text-sm"
          >
            <Table.Header>
              <Table.Column
                id="email"
                isRowHeader
                className="border-b border-border bg-surface-subtle px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                Email
              </Table.Column>
              <Table.Column
                id="role"
                className="border-b border-border bg-surface-subtle px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                Role
              </Table.Column>
              <Table.Column
                id="expires"
                className="border-b border-border bg-surface-subtle px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                Expires
              </Table.Column>
              <Table.Column
                id="actions"
                className="border-b border-border bg-surface-subtle px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                Actions
              </Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() =>
                loading ? null : (
                  <div className="py-8 text-center text-sm text-text-muted">
                    No pending invitations.
                  </div>
                )
              }
            >
              {invitations.map((inv) => (
                <Table.Row
                  key={inv.id}
                  id={inv.id}
                  className="border-b border-border last:border-0 hover:bg-surface-subtle"
                >
                  <Table.Cell className="px-5 py-3 text-text-primary">
                    {inv.email}
                  </Table.Cell>
                  <Table.Cell className="px-5 py-3">
                    <span className="rounded-full border border-border bg-chip-bg px-2 py-0.5 text-xs font-medium text-text-secondary capitalize">
                      {inv.role}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="px-5 py-3 text-text-muted">
                    {formatExpiry(inv.expires_at)}
                  </Table.Cell>
                  <Table.Cell className="px-5 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => handleOpenConfirm(inv.id)}
                    >
                      Cancel
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </div>
      )}

      <Modal
        isOpen={confirmId !== null && invitation !== undefined}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Cancel invitation</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-text-secondary">
                  Cancel the invitation sent to {invitation?.email}? The invite
                  link will no longer work.
                </p>
                {cancelMutation.isError && (
                  <Alert status="danger" className="mt-4">
                    <Alert.Content>
                      <Alert.Description>
                        {cancelMutation.error?.message ??
                          "Failed to cancel invitation."}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="outline" onPress={() => setConfirmId(null)}>
                  Keep invitation
                </Button>
                <Button
                  variant="primary"
                  onPress={handleConfirmCancel}
                  isDisabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? "Cancelling…" : "Cancel invitation"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </section>
  );
}

export default function AdminMembersPage() {
  const { selectedWorkspaceId } = useWorkspaceContext();

  const membersQuery = useWorkspaceMembers(selectedWorkspaceId);
  const invitationsQuery = useWorkspaceInvitations(selectedWorkspaceId);

  if (!selectedWorkspaceId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-text-muted">
          No workspace selected. Please select a workspace first.
        </p>
      </div>
    );
  }

  if (membersQuery.loading && invitationsQuery.loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Members</h1>
        <p className="mt-1 text-sm text-text-muted">
          Manage workspace members and invitations.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <MembersTable
          workspaceId={selectedWorkspaceId}
          members={membersQuery.members}
          loading={membersQuery.loading}
          error={membersQuery.error}
        />

        <InviteForm workspaceId={selectedWorkspaceId} />

        <InvitationsTable
          workspaceId={selectedWorkspaceId}
          invitations={invitationsQuery.invitations}
          loading={invitationsQuery.loading}
          error={invitationsQuery.error}
        />
      </div>
    </div>
  );
}
