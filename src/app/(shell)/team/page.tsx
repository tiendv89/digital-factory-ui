"use client";

import { Users } from "lucide-react";
import { Spinner } from "@heroui/react";
import { useTeamMembers, MemberRow } from "@/features/team";

export default function TeamPage() {
  const { members, loading, error, workspaceId } = useTeamMembers();

  if (!workspaceId) {
    return (
      <div
        data-team-page
        className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center"
      >
        <Users className="h-10 w-10 text-text-muted" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-text-primary">Team</p>
          <p className="mt-1 text-xs text-text-muted">
            No workspace selected. Select a workspace to view the roster.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-team-page className="h-full overflow-auto px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Team</h1>
            <p className="mt-0.5 text-xs text-text-muted">
              Workspace roster — workload and activity status are placeholders.
            </p>
          </div>
          {loading && <Spinner size="sm" />}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/40 bg-danger-bg px-4 py-3 text-sm text-danger">
            Failed to load team roster: {error.message}
          </div>
        )}

        {!loading && !error && members.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <Users className="h-10 w-10 text-text-muted" aria-hidden />
            <p className="text-sm text-text-muted">
              No members found in this workspace.
            </p>
          </div>
        )}

        {members.length > 0 && (
          <div className="flex flex-col gap-2">
            {members.map((member) => (
              <MemberRow key={member.user_id} member={member} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
