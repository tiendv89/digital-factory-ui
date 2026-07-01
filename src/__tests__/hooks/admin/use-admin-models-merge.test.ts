import { describe, expect, it } from "vitest";

import type { ModelCatalogEntry } from "@/services/hermes-agent/admin";
import type { ModelPricing } from "@/services/user-service";

// Inline the merge logic to test it directly without React setup.
function mergeByModelId(catalog: ModelCatalogEntry[], pricing: ModelPricing[]) {
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

const baseEntry = (model_id: string): ModelCatalogEntry => ({
  model_id,
  display_name: `Model ${model_id}`,
  provider: "anthropic",
  is_active: true,
  is_default: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

const basePricing = (model_id: string, effective_to: string | null = null): ModelPricing => ({
  id: `00000000-0000-0000-0000-${model_id.slice(0, 12).padStart(12, "0")}`,
  model_id,
  input_cost_per_mtok: 3.0,
  output_cost_per_mtok: 15.0,
  cache_read_cost_per_mtok: 0.3,
  cache_write_cost_per_mtok: 3.75,
  effective_from: "2026-01-01T00:00:00Z",
  effective_to,
});

describe("mergeByModelId", () => {
  it("merges catalog and pricing by model_id", () => {
    const catalog = [baseEntry("claude-sonnet-4-6"), baseEntry("claude-haiku-4-5")];
    const pricing = [basePricing("claude-sonnet-4-6"), basePricing("claude-haiku-4-5")];
    const result = mergeByModelId(catalog, pricing);
    expect(result).toHaveLength(2);
    expect(result[0].pricing?.model_id).toBe("claude-sonnet-4-6");
    expect(result[1].pricing?.model_id).toBe("claude-haiku-4-5");
  });

  it("sets pricing to null for an unpriced model (no pricing row)", () => {
    const catalog = [baseEntry("new-model-unpriced")];
    const pricing: ModelPricing[] = [];
    const result = mergeByModelId(catalog, pricing);
    expect(result[0].pricing).toBeNull();
  });

  it("selects only the current pricing row (effective_to IS NULL)", () => {
    const catalog = [baseEntry("claude-sonnet-4-6")];
    const oldRow = basePricing("claude-sonnet-4-6", "2026-06-01T00:00:00Z");
    const currentRow = basePricing("claude-sonnet-4-6", null);
    currentRow.id = "current-row-id";
    currentRow.input_cost_per_mtok = 5.0;
    const result = mergeByModelId(catalog, [oldRow, currentRow]);
    expect(result[0].pricing?.id).toBe("current-row-id");
    expect(result[0].pricing?.input_cost_per_mtok).toBe(5.0);
  });

  it("includes retired-but-still-priced model in result with pricing intact", () => {
    const retiredEntry = { ...baseEntry("claude-opus-old"), is_active: false };
    const catalog = [retiredEntry];
    const pricing = [basePricing("claude-opus-old")];
    const result = mergeByModelId(catalog, pricing);
    expect(result[0].is_active).toBe(false);
    expect(result[0].pricing).not.toBeNull();
  });

  it("preserves catalog entries when pricing list is empty", () => {
    const catalog = [baseEntry("model-a"), baseEntry("model-b")];
    const result = mergeByModelId(catalog, []);
    expect(result).toHaveLength(2);
    result.forEach((m) => expect(m.pricing).toBeNull());
  });

  it("ignores orphan pricing rows (model not in catalog)", () => {
    const catalog = [baseEntry("active-model")];
    const pricing = [basePricing("active-model"), basePricing("ghost-model")];
    const result = mergeByModelId(catalog, pricing);
    expect(result).toHaveLength(1);
    expect(result[0].model_id).toBe("active-model");
  });
});
