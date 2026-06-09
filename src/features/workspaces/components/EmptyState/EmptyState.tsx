"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useSession } from "@/features/auth";
import { getMeData } from "@/services/user-service";
import { CreateOrgModal } from "@/features/workspaces/components/CreateOrgModal";

export function EmptyState() {
  const { session, logout } = useSession();
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const sessionData =
    session.status === "authenticated" ? getMeData(session.data) : null;

  const isPlatformAdmin =
    session.status === "authenticated" &&
    (sessionData?.memberships ?? []).some((m) => m.role === "platform_admin");

  const hasNoOrg =
    session.status === "authenticated" &&
    (sessionData?.memberships ?? []).length === 0;

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-bg px-4"
      data-testid="empty-state"
    >
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        {hasNoOrg ? (
          <>
            <div>
              <h1 className="mb-2 text-xl font-semibold text-text-primary">
                Welcome to Delivery IDE
              </h1>
              <p className="text-sm text-text-secondary">
                Create an organization to get started, or ask your team lead to
                invite you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateOrg(true)}
              data-testid="empty-state-create-org"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Create Organization
            </button>
          </>
        ) : (
          <p className="text-sm text-text-secondary">
            Your workspace will appear here as soon as your engagement is set up.
            If you expected to see something, contact your delivery lead.
          </p>
        )}

        {isPlatformAdmin && (
          <Link
            href="/admin/connect"
            className="rounded px-3 py-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="empty-state-import-link"
          >
            Import workspace
          </Link>
        )}

        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="empty-state-logout"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>

      {showCreateOrg && (
        <CreateOrgModal
          onClose={() => setShowCreateOrg(false)}
          onSuccess={() => setShowCreateOrg(false)}
        />
      )}
    </main>
  );
}
