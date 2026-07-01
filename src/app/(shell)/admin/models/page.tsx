"use client";

import { Checkbox, Input, ListBox, Modal, Select } from "@heroui/react";
import { ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";

import { Badge, Button, Card, cn, Field } from "@/components/common";
import type { CreateModelCatalogRequest, CreateModelPricingRequest, MergedModelEntry, ModelPricing, UpdateModelCatalogRequest } from "@/hooks/admin/use-admin-models";
import { useAdminModels, useCreateModel, useCreatePricing, useUpdateModel } from "@/hooks/admin/use-admin-models";

const PROVIDERS = ["anthropic", "deepseek"] as const;
type Provider = (typeof PROVIDERS)[number];

/** Shared control styling so HeroUI's Input and Select render identically to
 * each other (and to the app's other form fields) — the HeroUI defaults for
 * each differ (pill vs. bordered box), which looked inconsistent side by side. */
const FIELD_CLASS =
  "h-9 w-full rounded-[8px] border border-border-control bg-surface-secondary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function formatRate(v: number): string {
  return v.toFixed(4);
}

/** Compact 2x2 rate grid so the table needs one "Pricing" column instead of
 * four — four separate $/M-tok columns made headers wrap onto multiple lines. */
function PricingCell({ pricing }: { pricing: ModelPricing | null }) {
  if (!pricing) return <span className="text-warning text-xs">Unpriced</span>;
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
      <span>
        <span className="text-text-muted">In</span> <span className="font-mono text-text-primary">{formatRate(pricing.input_cost_per_mtok)}</span>
      </span>
      <span>
        <span className="text-text-muted">Out</span> <span className="font-mono text-text-primary">{formatRate(pricing.output_cost_per_mtok)}</span>
      </span>
      <span>
        <span className="text-text-muted">CR</span> <span className="font-mono text-text-primary">{formatRate(pricing.cache_read_cost_per_mtok)}</span>
      </span>
      <span>
        <span className="text-text-muted">CW</span> <span className="font-mono text-text-primary">{formatRate(pricing.cache_write_cost_per_mtok)}</span>
      </span>
    </div>
  );
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

  const editingModel = editingId ? ((models ?? []).find((m) => m.model_id === editingId) ?? null) : null;
  const pricingModel = pricingId ? ((models ?? []).find((m) => m.model_id === pricingId) ?? null) : null;

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
              <th className="px-4 py-2.5 font-medium whitespace-nowrap">Pricing ($/M tok)</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(models ?? []).map((model) => (
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
                <td className="px-4 py-2.5">
                  <PricingCell pricing={model.pricing} />
                </td>
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
            ))}
            {(models ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                  No models found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {editingModel && (
        <EditModelModal
          model={editingModel}
          onSave={(body) => {
            updateModel.mutate({ modelId: editingModel.model_id, body }, { onSuccess: () => setEditingId(null) });
          }}
          onCancel={() => setEditingId(null)}
          error={updateModel.error as Error | null}
          isPending={updateModel.isPending}
        />
      )}

      {pricingModel && (
        <UpdatePricingModal
          model={pricingModel}
          onSave={(body) => {
            createPricing.mutate({ ...body, model_id: pricingModel.model_id }, { onSuccess: () => setPricingId(null) });
          }}
          onCancel={() => setPricingId(null)}
          error={createPricing.error as Error | null}
          isPending={createPricing.isPending}
        />
      )}
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
            <Input className={FIELD_CLASS} required value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="claude-sonnet-5" />
          </Field>
          <Field label="Display Name" required>
            <Input className={FIELD_CLASS} required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Claude Sonnet 5" />
          </Field>
          <Field label="Provider" required>
            <Select.Root selectedKey={provider} onSelectionChange={(key) => key != null && setProvider(String(key) as Provider)} aria-label="Provider">
              <Select.Trigger className={cn(FIELD_CLASS, "flex items-center gap-1 transition-colors hover:border-primary")}>
                <Select.Value className="truncate" />
                <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
              </Select.Trigger>
              <Select.Popover className="min-w-40 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg">
                <ListBox className="max-h-60 overflow-auto outline-none">
                  {PROVIDERS.map((p) => (
                    <ListBox.Item key={p} id={p} textValue={p} className="cursor-pointer rounded-md px-2.5 py-1.5 text-sm text-text-primary outline-none data-[focused=true]:bg-surface-secondary">
                      {p}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select.Root>
          </Field>
        </div>
        <p className="text-xs font-medium text-text-muted">Initial Pricing (USD per million tokens)</p>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Input" required>
            <Input className={FIELD_CLASS} type="number" step="any" min="0" required value={inputCost} onChange={(e) => setInputCost(e.target.value)} placeholder="3.0000" />
          </Field>
          <Field label="Output" required>
            <Input className={FIELD_CLASS} type="number" step="any" min="0" required value={outputCost} onChange={(e) => setOutputCost(e.target.value)} placeholder="15.0000" />
          </Field>
          <Field label="Cache Read" required>
            <Input className={FIELD_CLASS} type="number" step="any" min="0" required value={cacheReadCost} onChange={(e) => setCacheReadCost(e.target.value)} placeholder="0.3000" />
          </Field>
          <Field label="Cache Write" required>
            <Input className={FIELD_CLASS} type="number" step="any" min="0" required value={cacheWriteCost} onChange={(e) => setCacheWriteCost(e.target.value)} placeholder="3.7500" />
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

/** Shared modal shell for the Edit / Pricing dialogs — matches the app's
 * standard Modal.Root/Backdrop/Container/Dialog convention (see
 * create-workspace-modal.tsx) rather than the ad-hoc inline table rows these
 * replaced. */
function ModelModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal.Root isOpen onOpenChange={(o) => !o && onClose()}>
      <Modal.Backdrop variant="opaque" isDismissable>
        <Modal.Container placement="center">
          <Modal.Dialog className="flex w-full max-w-md flex-col overflow-hidden rounded-[13px] border border-border bg-surface p-0 shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
            <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
                {subtitle && <code className="mt-0.5 block text-xs text-text-muted">{subtitle}</code>}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </header>
            {children}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

function EditModelModal({
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
    <ModelModalShell title="Edit Model" subtitle={model.model_id} onClose={onCancel}>
      <div className="space-y-4 p-5">
        <Field label="Display Name" required>
          <Input className={FIELD_CLASS} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus />
        </Field>
        <div className="flex flex-col gap-2">
          <Checkbox.Root isSelected={isActive} onChange={setIsActive} className="flex items-center gap-2">
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content className="text-sm text-text-secondary">Active</Checkbox.Content>
          </Checkbox.Root>
          <Checkbox.Root isSelected={isDefault} onChange={setIsDefault} className="flex items-center gap-2">
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content className="text-sm text-text-secondary">Default</Checkbox.Content>
          </Checkbox.Root>
        </div>
        {error && <p className="text-xs text-danger">{error.message}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
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
      </div>
    </ModelModalShell>
  );
}

function UpdatePricingModal({
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
    <ModelModalShell title="Update Pricing" subtitle={model.model_id} onClose={onCancel}>
      <div className="space-y-4 p-5">
        <p className="text-xs font-medium text-text-muted">USD per million tokens</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Input" required>
            <Input className={FIELD_CLASS} type="number" step="any" min="0" value={inputCost} onChange={(e) => setInputCost(e.target.value)} autoFocus />
          </Field>
          <Field label="Output" required>
            <Input className={FIELD_CLASS} type="number" step="any" min="0" value={outputCost} onChange={(e) => setOutputCost(e.target.value)} />
          </Field>
          <Field label="Cache Read" required>
            <Input className={FIELD_CLASS} type="number" step="any" min="0" value={cacheReadCost} onChange={(e) => setCacheReadCost(e.target.value)} />
          </Field>
          <Field label="Cache Write" required>
            <Input className={FIELD_CLASS} type="number" step="any" min="0" value={cacheWriteCost} onChange={(e) => setCacheWriteCost(e.target.value)} />
          </Field>
        </div>
        {error && <p className="text-xs text-danger">{error.message}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
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
      </div>
    </ModelModalShell>
  );
}
