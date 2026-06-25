"use client";

import { useState } from "react";

import { useAdminPlans, useCreatePlan, useUpdatePlan } from "@/hooks/admin/use-admin-plans";
import type { BillingPlan, CreateBillingPlanRequest } from "@/services/user-service";

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
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {showCreate ? "Cancel" : "New Plan"}
        </button>
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

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary text-left text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Display Name</th>
              <th className="px-4 py-2 font-medium text-right">Daily Cap (credits)</th>
              <th className="px-4 py-2 font-medium text-right">Weekly Cap (credits)</th>
              <th className="px-4 py-2 font-medium"></th>
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
                  <td className="px-4 py-2 font-mono text-xs text-text-muted">{plan.name}</td>
                  <td className="px-4 py-2 text-text-primary">{plan.display_name}</td>
                  <td className="px-4 py-2 text-right text-text-primary">{plan.daily_credit_cap == null ? <span className="text-text-muted">∞</span> : plan.daily_credit_cap.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-text-primary">{plan.weekly_credit_cap == null ? <span className="text-text-muted">∞</span> : plan.weekly_credit_cap.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => setEditingId(plan.id)} className="text-xs text-text-secondary underline hover:text-text-primary">
                      Edit
                    </button>
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
      </div>
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
      daily_credit_cap: dailyCap === "" ? null : Number(dailyCap),
      weekly_credit_cap: weeklyCap === "" ? null : Number(weeklyCap),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-border bg-surface p-4 space-y-3">
      <h2 className="text-sm font-semibold text-text-primary">Create Plan</h2>
      {error && <div className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error.message}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">Name (slug)</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="pro"
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Display Name</label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Pro"
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Daily Cap (credits, empty = unlimited)</label>
          <input
            type="number"
            min="0"
            value={dailyCap}
            onChange={(e) => setDailyCap(e.target.value)}
            placeholder="e.g. 1000"
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Weekly Cap (credits, empty = unlimited)</label>
          <input
            type="number"
            min="0"
            value={weeklyCap}
            onChange={(e) => setWeeklyCap(e.target.value)}
            placeholder="e.g. 5000"
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isPending ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
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
  onSave: (body: { display_name?: string; daily_credit_cap?: number | null; weekly_credit_cap?: number | null }) => void;
  onCancel: () => void;
  error: Error | null;
  isPending: boolean;
}) {
  const [displayName, setDisplayName] = useState(plan.display_name);
  const [dailyCap, setDailyCap] = useState(plan.daily_credit_cap == null ? "" : String(plan.daily_credit_cap));
  const [weeklyCap, setWeeklyCap] = useState(plan.weekly_credit_cap == null ? "" : String(plan.weekly_credit_cap));

  return (
    <tr className="bg-surface-secondary/30">
      <td className="px-4 py-2 font-mono text-xs text-text-muted">{plan.name}</td>
      <td className="px-4 py-2">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded border border-border bg-bg px-2 py-1 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        {error && <p className="mt-1 text-xs text-danger">{error.message}</p>}
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min="0"
          value={dailyCap}
          onChange={(e) => setDailyCap(e.target.value)}
          placeholder="∞"
          className="w-full rounded border border-border bg-bg px-2 py-1 text-right text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min="0"
          value={weeklyCap}
          onChange={(e) => setWeeklyCap(e.target.value)}
          placeholder="∞"
          className="w-full rounded border border-border bg-bg px-2 py-1 text-right text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              onSave({
                display_name: displayName,
                daily_credit_cap: dailyCap === "" ? null : Number(dailyCap),
                weekly_credit_cap: weeklyCap === "" ? null : Number(weeklyCap),
              })
            }
            disabled={isPending}
            className="text-xs text-primary underline hover:text-primary/80 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onCancel} className="text-xs text-text-secondary underline hover:text-text-primary">
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}
