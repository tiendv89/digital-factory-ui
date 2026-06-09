"use client";

import { Loader2, AlertCircle, Layers } from "lucide-react";
import { useOrgWorkspaces } from "@/features/admin/hooks/useOrgSettings";

interface OrgWorkspacesTabProps {
  orgId: string;
}

export function OrgWorkspacesTab({ orgId }: OrgWorkspacesTabProps) {
  const { workspaces, loading, error } = useOrgWorkspaces(orgId);

  return (
    <div className="space-y-6" data-org-workspaces>
      <section aria-labelledby="org-workspaces-heading">
        <h3
          id="org-workspaces-heading"
          className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          Workspaces
        </h3>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-text-muted" data-workspaces-loading>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span className="text-sm">Loading workspaces…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-8 text-danger" data-workspaces-error>
            <AlertCircle className="h-4 w-4" aria-hidden />
            <span className="text-sm">Failed to load workspaces: {error.message}</span>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center">
            <Layers className="mx-auto mb-2 h-6 w-6 text-text-muted" aria-hidden />
            <p className="text-sm text-text-muted">No workspaces in this organisation.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface divide-y divide-border" data-workspaces-list>
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className="flex items-center gap-3 px-4 py-3"
                data-workspace-row={ws.id}
              >
                <Layers className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{ws.name}</p>
                  <p className="truncate font-mono text-xs text-text-muted">@{ws.slug}</p>
                </div>
                <span className="font-mono text-[10px] text-text-muted">{ws.id}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
