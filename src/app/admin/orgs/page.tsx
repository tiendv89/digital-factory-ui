"use client";

import { useState } from "react";

import { useAdminOrgs, useAdminPlans, useAssignOrgPlan, useRemoveOrgPlan } from "@/hooks/admin/use-admin-plans";
import type { AdminOrg } from "@/services/user-service";

export default function AdminOrgsPage() {
  const [page] = useState(1);
  const { data, isLoading, error } = useAdminOrgs(page);
  const { data: plans } = useAdminPlans();
  const assignPlan = useAssignOrgPlan();
  const removePlan = useRemoveOrgPlan();

  const [assigningOrgId, setAssigningOrgId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [assignError, setAssignError] = useState<string | null>(null);

  function handleAssign(orgId: string) {
    if (!selectedPlanId) return;
    setAssignError(null);
    assignPlan.mutate(
      { orgId, body: { plan_id: selectedPlanId } },
      {
        onSuccess: () => {
          setAssigningOrgId(null);
          setSelectedPlanId("");
        },
        onError: (err) => setAssignError((err as Error).message),
      },
    );
  }

  function handleRemove(orgId: string) {
    removePlan.mutate(orgId);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
        Failed to load orgs: {(error as Error).message}
      </div>
    );
  }

  const orgs: AdminOrg[] = data?.orgs ?? [];

  return (
    <div data-admin-orgs className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Organizations</h1>
        <span className="text-sm text-text-muted">{data?.total ?? 0} total</span>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary text-left text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Slug</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-surface-secondary/50">
                <td className="px-4 py-2 text-text-primary">{org.name}</td>
                <td className="px-4 py-2 font-mono text-xs text-text-muted">{org.slug}</td>
                <td className="px-4 py-2 text-text-primary">
                  {org.effective_plan ? org.effective_plan.plan.display_name : <span className="text-text-muted">Free</span>}
                </td>
                <td className="px-4 py-2 text-right">
                  {assigningOrgId === org.id ? (
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
                      <button
                        type="button"
                        onClick={() => handleAssign(org.id)}
                        disabled={!selectedPlanId || assignPlan.isPending}
                        className="text-xs text-primary underline disabled:opacity-50"
                      >
                        {assignPlan.isPending ? "Assigning…" : "Assign"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAssigningOrgId(null);
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
                          setAssigningOrgId(org.id);
                          setSelectedPlanId("");
                          setAssignError(null);
                        }}
                        className="text-xs text-text-secondary underline hover:text-text-primary"
                      >
                        Assign plan
                      </button>
                      {org.effective_plan && (
                        <button
                          type="button"
                          onClick={() => handleRemove(org.id)}
                          disabled={removePlan.isPending}
                          className="text-xs text-danger underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                  No organizations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
