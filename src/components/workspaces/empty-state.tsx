"use client";

import { Zap } from "lucide-react";
import { useState } from "react";

import { useSession } from "@/components/auth";
import { CreateOrgModal } from "@/components/orgs/create-org-modal";
import { getMeData } from "@/services/user-service";

export function EmptyState() {
  const { session } = useSession();
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const sessionData = session.status === "authenticated" ? getMeData(session.data) : null;

  const hasNoOrg = session.status === "authenticated" && (sessionData?.memberships ?? []).length === 0;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-4" data-testid="empty-state">
      {/* Background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Brand */}
      <div className="relative mb-8 flex items-center gap-2.5">
        <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-primary">
          <Zap className="h-4 w-4 text-white" fill="currentColor" aria-hidden />
        </div>
        <span className="text-[14px] font-bold text-text-primary">Delivery IDE</span>
      </div>

      <div className="relative flex max-w-md flex-col items-center gap-6 text-center">
        {hasNoOrg ? (
          <>
            <div>
              <h1 className="mb-2 text-xl font-semibold text-text-primary">Welcome to Delivery IDE</h1>
              <p className="text-sm text-text-secondary">Create an organization to get started, or ask your team lead to invite you.</p>
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
          <p className="text-sm text-text-secondary">Your workspace will appear here as soon as your engagement is set up.</p>
        )}
      </div>

      {showCreateOrg && <CreateOrgModal onClose={() => setShowCreateOrg(false)} onSuccess={() => setShowCreateOrg(false)} />}
    </main>
  );
}
