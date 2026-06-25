"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Badge, Button, Card, Field, Input } from "@/components/common";
import { useAdminPlans, useCreatePlan, useUpdatePlan } from "@/hooks/admin/use-admin-plans";
import type { BillingPlan, CreateBillingPlanRequest } from "@/services/user-service";

function formatCap(cap: number) {
  return cap === 0 ? <span className="text-text-muted">∞</span> : cap.toLocaleString();
}

export default function AdminPlansPage() {
  const { data: plans, isLoading, error } = useAdminPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">Failed to load plans: {(error as Error).message}</div>;
  }

  return (
    <div data-admin-plans className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Billing Plans</h1>
        <Button variant={showCreate ? "secondary" : "primary"} size="sm" leftIcon={showCreate ? undefined : <Plus className="h-4 w-4" />} onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "New Plan"}
        </Button>
      </div>

      {showCreate && (
        <CreatePlanForm
          onSubmit={(body) => {
            createPlan.mutate(body, { onSuccess: () => setShowCreate(false) });
          }}
          error={createPlan.error as Error | null}
          isPending={createPlan.isPending}
        />
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary text-left text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Display Name</th>
              <th className="px-4 py-2.5 font-medium text-right">Daily Cap (credits)</th>
              <th className="px-4 py-2.5 font-medium text-right">Weekly Cap (credits)</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(plans ?? []).map((plan) =>
              editingId === plan.id ? (
                <EditPlanRow
                  key={plan.id}
                  plan={plan}
                  onSave={(body) => {
                    updatePlan.mutate({ planId: plan.id, body }, { onSuccess: () => setEditingId(null) });
                  }}
                  onCancel={() => setEditingId(null)}
                  error={updatePlan.error as Error | null}
                  isPending={updatePlan.isPending}
                />
              ) : (
                <tr key={plan.id} className="hover:bg-surface-secondary/50">
                  <td className="px-4 py-2.5">
                    <Badge tone="neutral">{plan.name}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-text-primary">{plan.display_name}</td>
                  <td className="px-4 py-2.5 text-right text-text-primary">{formatCap(plan.daily_credits_cap)}</td>
                  <td className="px-4 py-2.5 text-right text-text-primary">{formatCap(plan.weekly_credits_cap)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(plan.id)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ),
            )}
            {(plans ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No plans found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function CreatePlanForm({ onSubmit, error, isPending }: { onSubmit: (body: CreateBillingPlanRequest) => void; error: Error | null; isPending: boolean }) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dailyCap, setDailyCap] = useState("");
  const [weeklyCap, setWeeklyCap] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      display_name: displayName,
      daily_credits_cap: dailyCap === "" ? 0 : Number(dailyCap),
      weekly_credits_cap: weeklyCap === "" ? 0 : Number(weeklyCap),
    });
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">Create Plan</h2>
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error.message}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name (slug)" required>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="pro" />
          </Field>
          <Field label="Display Name" required>
            <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Pro" />
          </Field>
          <Field label="Daily Cap (credits)" hint="Empty = unlimited">
            <Input type="number" min="0" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} placeholder="e.g. 1000" />
          </Field>
          <Field label="Weekly Cap (credits)" hint="Empty = unlimited">
            <Input type="number" min="0" value={weeklyCap} onChange={(e) => setWeeklyCap(e.target.value)} placeholder="e.g. 5000" />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="sm" loading={isPending}>
            Create
          </Button>
        </div>
      </form>
    </Card>
  );
}

function EditPlanRow({
  plan,
  onSave,
  onCancel,
  error,
  isPending,
}: {
  plan: BillingPlan;
  onSave: (body: { display_name?: string; daily_credits_cap?: number; weekly_credits_cap?: number }) => void;
  onCancel: () => void;
  error: Error | null;
  isPending: boolean;
}) {
  const [displayName, setDisplayName] = useState(plan.display_name);
  const [dailyCap, setDailyCap] = useState(plan.daily_credits_cap === 0 ? "" : String(plan.daily_credits_cap));
  const [weeklyCap, setWeeklyCap] = useState(plan.weekly_credits_cap === 0 ? "" : String(plan.weekly_credits_cap));

  return (
    <tr className="bg-surface-secondary/30">
      <td className="px-4 py-2.5">
        <Badge tone="neutral">{plan.name}</Badge>
      </td>
      <td className="px-4 py-2.5">
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        {error && <p className="mt-1 text-xs text-danger">{error.message}</p>}
      </td>
      <td className="px-4 py-2.5">
        <Input type="number" min="0" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} placeholder="∞" className="text-right" />
      </td>
      <td className="px-4 py-2.5">
        <Input type="number" min="0" value={weeklyCap} onChange={(e) => setWeeklyCap(e.target.value)} placeholder="∞" className="text-right" />
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="primary"
            size="sm"
            loading={isPending}
            onClick={() =>
              onSave({
                display_name: displayName,
                daily_credits_cap: dailyCap === "" ? 0 : Number(dailyCap),
                weekly_credits_cap: weeklyCap === "" ? 0 : Number(weeklyCap),
              })
            }
          >
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}
