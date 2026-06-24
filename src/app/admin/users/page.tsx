"use client";

import { useState } from "react";

import { useAdminPlans, useAdminUsers, useAssignUserPlan, useRemoveUserPlan } from "@/hooks/admin/use-admin-plans";
import type { AdminUser } from "@/services/user-service";

export default function AdminUsersPage() {
  const [page] = useState(1);
  const { data, isLoading, error } = useAdminUsers(page);
  const { data: plans } = useAdminPlans();
  const assignPlan = useAssignUserPlan();
  const removePlan = useRemoveUserPlan();

  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [assignError, setAssignError] = useState<string | null>(null);

  function handleAssign(userId: string) {
    if (!selectedPlanId) return;
    setAssignError(null);
    assignPlan.mutate(
      { userId, body: { plan_id: selectedPlanId } },
      {
        onSuccess: () => {
          setAssigningUserId(null);
          setSelectedPlanId("");
        },
        onError: (err) => setAssignError((err as Error).message),
      },
    );
  }

  function handleRemove(userId: string) {
    removePlan.mutate(userId);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">Failed to load users: {(error as Error).message}</div>;
  }

  const users: AdminUser[] = data?.users ?? [];

  return (
    <div data-admin-users className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Users</h1>
        <span className="text-sm text-text-muted">{data?.total ?? 0} total</span>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary text-left text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Display Name</th>
              <th className="px-4 py-2 font-medium">Effective Plan</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-surface-secondary/50">
                <td className="px-4 py-2 text-text-primary">{user.email}</td>
                <td className="px-4 py-2 text-text-secondary">{user.display_name ?? "—"}</td>
                <td className="px-4 py-2 text-text-primary">{user.effective_plan ? user.effective_plan.plan.display_name : <span className="text-text-muted">Free</span>}</td>
                <td className="px-4 py-2">{user.effective_plan ? <SourceBadge source={user.effective_plan.source} /> : <span className="text-text-muted text-xs">default</span>}</td>
                <td className="px-4 py-2 text-right">
                  {assigningUserId === user.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={selectedPlanId}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        className="rounded border border-border bg-bg px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <option value="">Select plan…</option>
                        {(plans ?? []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.display_name}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => handleAssign(user.id)} disabled={!selectedPlanId || assignPlan.isPending} className="text-xs text-primary underline disabled:opacity-50">
                        {assignPlan.isPending ? "Assigning…" : "Assign"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAssigningUserId(null);
                          setSelectedPlanId("");
                          setAssignError(null);
                        }}
                        className="text-xs text-text-secondary underline"
                      >
                        Cancel
                      </button>
                      {assignError && <span className="text-xs text-danger">{assignError}</span>}
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAssigningUserId(user.id);
                          setSelectedPlanId("");
                          setAssignError(null);
                        }}
                        className="text-xs text-text-secondary underline hover:text-text-primary"
                      >
                        Assign plan
                      </button>
                      {user.effective_plan?.source === "individual" && (
                        <button type="button" onClick={() => handleRemove(user.id)} disabled={removePlan.isPending} className="text-xs text-danger underline disabled:opacity-50">
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: "individual" | "org" | "free" }) {
  const styles: Record<string, string> = {
    individual: "bg-primary/10 text-primary",
    org: "bg-success/10 text-success",
    free: "bg-surface-secondary text-text-muted",
  };
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[source] ?? styles.free}`}>{source}</span>;
}
