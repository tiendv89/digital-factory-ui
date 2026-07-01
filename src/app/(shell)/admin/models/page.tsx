"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Badge, Button, Card, Field, Input } from "@/components/common";
import type { CreateModelCatalogRequest, CreateModelPricingRequest, MergedModelEntry, UpdateModelCatalogRequest } from "@/hooks/admin/use-admin-models";
import { useAdminModels, useCreateModel, useCreatePricing, useUpdateModel } from "@/hooks/admin/use-admin-models";

const PROVIDERS = ["anthropic", "deepseek"] as const;
type Provider = (typeof PROVIDERS)[number];

function formatRate(v: number): string {
  return v.toFixed(4);
}

export default function AdminModelsPage() {
  const { data: models, isLoading, error } = useAdminModels();
  const createModel = useCreateModel();
  const updateModel = useUpdateModel();
  const createPricing = useCreatePricing();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pricingId, setPricingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">Failed to load models: {(error as Error).message}</div>;
  }

  return (
    <div data-admin-models className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Model Catalog</h1>
        <Button variant={showCreate ? "secondary" : "primary"} size="sm" leftIcon={showCreate ? undefined : <Plus className="h-4 w-4" />} onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "New Model"}
        </Button>
      </div>

      {showCreate && (
        <CreateModelForm
          onSubmit={(catalogBody, pricingBody) => {
            createModel.mutate(catalogBody, {
              onSuccess: () => {
                createPricing.mutate(
                  { ...pricingBody, model_id: catalogBody.model_id },
                  {
                    onSuccess: () => setShowCreate(false),
                  },
                );
              },
            });
          }}
          error={createModel.error as Error | null}
          pricingError={createPricing.error as Error | null}
          isPending={createModel.isPending || createPricing.isPending}
        />
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary text-left text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Model ID</th>
              <th className="px-4 py-2.5 font-medium">Display Name</th>
              <th className="px-4 py-2.5 font-medium">Provider</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">In ($/M tok)</th>
              <th className="px-4 py-2.5 font-medium text-right">Out ($/M tok)</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(models ?? []).map((model) =>
              editingId === model.model_id ? (
                <EditModelRow
                  key={model.model_id}
                  model={model}
                  onSave={(body) => {
                    updateModel.mutate({ modelId: model.model_id, body }, { onSuccess: () => setEditingId(null) });
                  }}
                  onCancel={() => setEditingId(null)}
                  error={updateModel.error as Error | null}
                  isPending={updateModel.isPending}
                />
              ) : pricingId === model.model_id ? (
                <UpdatePricingRow
                  key={model.model_id}
                  model={model}
                  onSave={(body) => {
                    createPricing.mutate({ ...body, model_id: model.model_id }, { onSuccess: () => setPricingId(null) });
                  }}
                  onCancel={() => setPricingId(null)}
                  error={createPricing.error as Error | null}
                  isPending={createPricing.isPending}
                />
              ) : (
                <tr key={model.model_id} className="hover:bg-surface-secondary/50">
                  <td className="px-4 py-2.5">
                    <code className="rounded bg-surface-secondary px-1.5 py-0.5 text-xs font-mono text-text-primary">{model.model_id}</code>
                  </td>
                  <td className="px-4 py-2.5 text-text-primary">{model.display_name}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone="neutral">{model.provider}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {model.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Retired</Badge>}
                      {model.is_default && <Badge tone="primary">Default</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-text-primary">{model.pricing ? formatRate(model.pricing.input_cost_per_mtok) : <span className="text-warning text-xs">Unpriced</span>}</td>
                  <td className="px-4 py-2.5 text-right text-text-primary">{model.pricing ? formatRate(model.pricing.output_cost_per_mtok) : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(model.model_id)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setPricingId(model.model_id)}>
                        Pricing
                      </Button>
                    </div>
                  </td>
                </tr>
              ),
            )}
            {(models ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                  No models found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function CreateModelForm({
  onSubmit,
  error,
  pricingError,
  isPending,
}: {
  onSubmit: (catalog: CreateModelCatalogRequest, pricing: Omit<CreateModelPricingRequest, "model_id">) => void;
  error: Error | null;
  pricingError: Error | null;
  isPending: boolean;
}) {
  const [modelId, setModelId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [inputCost, setInputCost] = useState("");
  const [outputCost, setOutputCost] = useState("");
  const [cacheReadCost, setCacheReadCost] = useState("");
  const [cacheWriteCost, setCacheWriteCost] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(
      { model_id: modelId, display_name: displayName, provider },
      {
        input_cost_per_mtok: Number(inputCost),
        output_cost_per_mtok: Number(outputCost),
        cache_read_cost_per_mtok: Number(cacheReadCost),
        cache_write_cost_per_mtok: Number(cacheWriteCost),
      },
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">Create Model</h2>
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error.message}</div>}
        {pricingError && <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">Pricing failed (model created but unpriced): {pricingError.message}</div>}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Model ID" required>
            <Input required value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="claude-sonnet-5" />
          </Field>
          <Field label="Display Name" required>
            <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Claude Sonnet 5" />
          </Field>
          <Field label="Provider" required>
            <select
              required
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-xs font-medium text-text-muted">Initial Pricing (USD per million tokens)</p>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Input" required>
            <Input type="number" step="any" min="0" required value={inputCost} onChange={(e) => setInputCost(e.target.value)} placeholder="3.0000" />
          </Field>
          <Field label="Output" required>
            <Input type="number" step="any" min="0" required value={outputCost} onChange={(e) => setOutputCost(e.target.value)} placeholder="15.0000" />
          </Field>
          <Field label="Cache Read" required>
            <Input type="number" step="any" min="0" required value={cacheReadCost} onChange={(e) => setCacheReadCost(e.target.value)} placeholder="0.3000" />
          </Field>
          <Field label="Cache Write" required>
            <Input type="number" step="any" min="0" required value={cacheWriteCost} onChange={(e) => setCacheWriteCost(e.target.value)} placeholder="3.7500" />
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

function EditModelRow({
  model,
  onSave,
  onCancel,
  error,
  isPending,
}: {
  model: MergedModelEntry;
  onSave: (body: UpdateModelCatalogRequest) => void;
  onCancel: () => void;
  error: Error | null;
  isPending: boolean;
}) {
  const [displayName, setDisplayName] = useState(model.display_name);
  const [isActive, setIsActive] = useState(model.is_active);
  const [isDefault, setIsDefault] = useState(model.is_default);

  return (
    <tr className="bg-surface-secondary/30">
      <td className="px-4 py-2.5">
        <code className="rounded bg-surface-secondary px-1.5 py-0.5 text-xs font-mono text-text-muted">{model.model_id}</code>
      </td>
      <td className="px-4 py-2.5">
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        {error && <p className="mt-1 text-xs text-danger">{error.message}</p>}
      </td>
      <td className="px-4 py-2.5">
        <Badge tone="neutral">{model.provider}</Badge>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            Active
          </label>
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded" />
            Default
          </label>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right text-text-muted">{model.pricing ? formatRate(model.pricing.input_cost_per_mtok) : "—"}</td>
      <td className="px-4 py-2.5 text-right text-text-muted">{model.pricing ? formatRate(model.pricing.output_cost_per_mtok) : "—"}</td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="primary"
            size="sm"
            loading={isPending}
            onClick={() =>
              onSave({
                display_name: displayName,
                is_active: isActive,
                is_default: isDefault,
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

function UpdatePricingRow({
  model,
  onSave,
  onCancel,
  error,
  isPending,
}: {
  model: MergedModelEntry;
  onSave: (body: Omit<CreateModelPricingRequest, "model_id">) => void;
  onCancel: () => void;
  error: Error | null;
  isPending: boolean;
}) {
  const [inputCost, setInputCost] = useState(model.pricing ? String(model.pricing.input_cost_per_mtok) : "");
  const [outputCost, setOutputCost] = useState(model.pricing ? String(model.pricing.output_cost_per_mtok) : "");
  const [cacheReadCost, setCacheReadCost] = useState(model.pricing ? String(model.pricing.cache_read_cost_per_mtok) : "");
  const [cacheWriteCost, setCacheWriteCost] = useState(model.pricing ? String(model.pricing.cache_write_cost_per_mtok) : "");

  return (
    <tr className="bg-surface-secondary/30">
      <td className="px-4 py-2.5" colSpan={3}>
        <div className="flex items-center gap-2">
          <code className="rounded bg-surface-secondary px-1.5 py-0.5 text-xs font-mono text-text-primary">{model.model_id}</code>
          <span className="text-xs text-text-muted">— Update Pricing (USD per million tokens)</span>
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error.message}</p>}
      </td>
      <td className="px-4 py-2.5">
        <Input type="number" step="any" min="0" placeholder="Input" value={inputCost} onChange={(e) => setInputCost(e.target.value)} className="text-right" />
      </td>
      <td className="px-4 py-2.5">
        <Input type="number" step="any" min="0" placeholder="Output" value={outputCost} onChange={(e) => setOutputCost(e.target.value)} className="text-right" />
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <Input type="number" step="any" min="0" placeholder="CR" value={cacheReadCost} onChange={(e) => setCacheReadCost(e.target.value)} className="text-right text-xs" />
            <Input type="number" step="any" min="0" placeholder="CW" value={cacheWriteCost} onChange={(e) => setCacheWriteCost(e.target.value)} className="text-right text-xs" />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="primary"
              size="sm"
              loading={isPending}
              onClick={() =>
                onSave({
                  input_cost_per_mtok: Number(inputCost),
                  output_cost_per_mtok: Number(outputCost),
                  cache_read_cost_per_mtok: Number(cacheReadCost),
                  cache_write_cost_per_mtok: Number(cacheWriteCost),
                })
              }
            >
              Update
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}
