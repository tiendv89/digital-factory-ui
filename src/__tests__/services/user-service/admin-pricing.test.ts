import { describe, expect, it } from "vitest";

import type { CreateModelPricingRequest, ModelPricing } from "@/services/user-service";

const basePricing: ModelPricing = {
  id: "00000000-0000-0000-0000-000000000001",
  model_id: "claude-sonnet-4-6",
  input_cost_per_mtok: 3.0,
  output_cost_per_mtok: 15.0,
  cache_read_cost_per_mtok: 0.3,
  cache_write_cost_per_mtok: 3.75,
  effective_from: "2026-01-01T00:00:00Z",
  effective_to: null,
};

describe("ModelPricing", () => {
  it("accepts a current pricing row (effective_to is null)", () => {
    expect(basePricing.effective_to).toBeNull();
    expect(basePricing.input_cost_per_mtok).toBe(3.0);
  });

  it("accepts a closed pricing row (effective_to is set)", () => {
    const closed: ModelPricing = {
      ...basePricing,
      id: "00000000-0000-0000-0000-000000000002",
      effective_to: "2026-06-01T00:00:00Z",
    };
    expect(closed.effective_to).toBe("2026-06-01T00:00:00Z");
  });

  it("has a uuid id field", () => {
    expect(typeof basePricing.id).toBe("string");
    expect(basePricing.id.length).toBeGreaterThan(0);
  });
});

describe("CreateModelPricingRequest", () => {
  it("requires all four cost fields and model_id", () => {
    const req: CreateModelPricingRequest = {
      model_id: "claude-sonnet-5",
      input_cost_per_mtok: 4.0,
      output_cost_per_mtok: 20.0,
      cache_read_cost_per_mtok: 0.4,
      cache_write_cost_per_mtok: 5.0,
    };
    expect(req.model_id).toBe("claude-sonnet-5");
    expect(req.effective_from).toBeUndefined();
  });

  it("accepts optional effective_from", () => {
    const req: CreateModelPricingRequest = {
      model_id: "claude-sonnet-5",
      input_cost_per_mtok: 4.0,
      output_cost_per_mtok: 20.0,
      cache_read_cost_per_mtok: 0.4,
      cache_write_cost_per_mtok: 5.0,
      effective_from: "2026-07-01T00:00:00Z",
    };
    expect(req.effective_from).toBe("2026-07-01T00:00:00Z");
  });
});
