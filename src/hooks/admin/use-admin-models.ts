import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateModelCatalogRequest, ModelCatalogEntry, UpdateModelCatalogRequest } from "@/services/hermes-agent/admin";
import { adminCreateModel, adminListModels, adminUpdateModel } from "@/services/hermes-agent/admin";
import type { CreateModelPricingRequest, ModelPricing } from "@/services/user-service";
import { adminCreatePricing, adminListPricing } from "@/services/user-service";

export type { CreateModelCatalogRequest, ModelCatalogEntry, UpdateModelCatalogRequest };
export type { CreateModelPricingRequest, ModelPricing };

// ─── Merged type ─────────────────────────────────────────────────────────────

export type MergedModelEntry = ModelCatalogEntry & {
  pricing: ModelPricing | null;
};

function mergeByModelId(catalog: ModelCatalogEntry[], pricing: ModelPricing[]): MergedModelEntry[] {
  // Build a map of model_id → current pricing row (effective_to IS NULL).
  const currentPricing = new Map<string, ModelPricing>();
  for (const row of pricing) {
    if (row.effective_to === null) {
      currentPricing.set(row.model_id, row);
    }
  }
  return catalog.map((entry) => ({
    ...entry,
    pricing: currentPricing.get(entry.model_id) ?? null,
  }));
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const ADMIN_CATALOG_KEY = ["admin", "models", "catalog"] as const;
export const ADMIN_PRICING_KEY = ["admin", "models", "pricing"] as const;
export const ADMIN_MODELS_KEY = ["admin", "models"] as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAdminModels() {
  const catalog = useQuery({
    queryKey: ADMIN_CATALOG_KEY,
    queryFn: adminListModels,
  });
  const pricing = useQuery({
    queryKey: ADMIN_PRICING_KEY,
    queryFn: adminListPricing,
  });

  const isLoading = catalog.isLoading || pricing.isLoading;
  const error = catalog.error ?? pricing.error;

  const data: MergedModelEntry[] | undefined = catalog.data !== undefined && pricing.data !== undefined ? mergeByModelId(catalog.data, pricing.data) : undefined;

  return { data, isLoading, error, catalog, pricing };
}

export function useCreateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateModelCatalogRequest) => adminCreateModel(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_CATALOG_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_MODELS_KEY });
    },
  });
}

export function useUpdateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ modelId, body }: { modelId: string; body: UpdateModelCatalogRequest }) => adminUpdateModel(modelId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_CATALOG_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_MODELS_KEY });
    },
  });
}

export function useCreatePricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateModelPricingRequest) => adminCreatePricing(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_PRICING_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_MODELS_KEY });
    },
  });
}
