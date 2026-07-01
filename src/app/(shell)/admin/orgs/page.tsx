"use client";

import { ListBox, Select } from "@heroui/react";
import { ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge, Button, Card } from "@/components/common";
import { useAdminOrgs, useAdminPlans, useAssignOrgPlan, useDeleteOrg, useRemoveOrgPlan } from "@/hooks/admin/use-admin-plans";
import type { AdminOrg, BillingPlan } from "@/services/user-service";

function PlanSelect({ plans, value, onChange }: { plans: BillingPlan[]; value: string; onChange: (id: string) => void }) {
  return (
    <Select.Root selectedKey={value || null} onSelectionChange={(key) => onChange(key == null ? "" : String(key))} aria-label="Select plan">
      <Select.Trigger className="flex h-8 min-w-36 items-center gap-1 rounded-[8px] border border-border-control bg-surface-secondary px-2.5 text-xs text-text-primary transition-colors hover:border-primary">
        <Select.Value className="truncate">{({ selectedText, isPlaceholder }) => (isPlaceholder ? "Select plan…" : selectedText)}</Select.Value>
        <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-text-muted" aria-hidden />
      </Select.Trigger>
      <Select.Popover className="min-w-40 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg">
        <ListBox className="max-h-60 overflow-auto outline-none">
          {plans.map((p) => (
            <ListBox.Item
              key={p.id}
              id={p.id}
              textValue={p.display_name}
              className="cursor-pointer rounded-md px-2 py-1.5 text-xs text-text-primary outline-none data-[focused=true]:bg-surface-secondary"
            >
              {p.display_name}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select.Root>
  );
}

export default function AdminOrgsPage() {
  const [page] = useState(1);
  const { data, isLoading, error } = useAdminOrgs(page);
  const { data: plans } = useAdminPlans();
  const assignPlan = useAssignOrgPlan();
  const removePlan = useRemoveOrgPlan();
  const deleteOrg = useDeleteOrg();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">Failed to load orgs: {(error as Error).message}</div>;
  }

  const orgs: AdminOrg[] = data?.orgs ?? [];

  return (
    <div data-admin-orgs className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Organizations</h1>
        <span className="text-sm text-text-muted">{data?.total ?? 0} total</span>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary text-left text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Slug</th>
              <th className="px-4 py-2.5 font-medium">Plan</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-surface-secondary/50">
                <td className="px-4 py-2.5 text-text-primary">{org.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-text-muted">{org.slug}</td>
                <td className="px-4 py-2.5">
                  <Badge tone="neutral">{org.effective_plan ? org.effective_plan.plan.display_name : "Free"}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {assigningOrgId === org.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <PlanSelect plans={plans ?? []} value={selectedPlanId} onChange={setSelectedPlanId} />
                      <Button variant="primary" size="sm" loading={assignPlan.isPending} disabled={!selectedPlanId} onClick={() => handleAssign(org.id)}>
                        Assign
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAssigningOrgId(null);
                          setSelectedPlanId("");
                          setAssignError(null);
                        }}
                      >
                        Cancel
                      </Button>
                      {assignError && <span className="text-xs text-danger">{assignError}</span>}
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAssigningOrgId(org.id);
                          setSelectedPlanId("");
                          setAssignError(null);
                        }}
                      >
                        Assign plan
                      </Button>
                      {org.effective_plan && org.effective_plan.plan.name !== "free" && (
                        <Button variant="ghost" size="sm" loading={removePlan.isPending} onClick={() => removePlan.mutate(org.id)}>
                          Remove plan
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        loading={deleteOrg.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete organization "${org.name}"? This removes the org, its memberships, invitations, and plan. Workspaces are not deleted.`)) {
                            deleteOrg.mutate(org.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
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
      </Card>
    </div>
  );
}
