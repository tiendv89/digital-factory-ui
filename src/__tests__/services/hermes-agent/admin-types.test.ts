import { describe, expect, it } from "vitest";

import type { CreateModelCatalogRequest, ModelCatalogEntry, UpdateModelCatalogRequest } from "@/services/hermes-agent/admin";

const baseEntry: ModelCatalogEntry = {
  model_id: "claude-sonnet-4-6",
  display_name: "Claude Sonnet 4.6",
  provider: "anthropic",
  is_active: true,
  is_default: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("ModelCatalogEntry", () => {
  it("accepts an active default model", () => {
    expect(baseEntry.is_active).toBe(true);
    expect(baseEntry.is_default).toBe(true);
    expect(baseEntry.provider).toBe("anthropic");
  });

  it("accepts a retired non-default model", () => {
    const retired: ModelCatalogEntry = { ...baseEntry, model_id: "claude-haiku-4-5", is_active: false, is_default: false };
    expect(retired.is_active).toBe(false);
    expect(retired.is_default).toBe(false);
  });

  it("accepts a deepseek model", () => {
    const ds: ModelCatalogEntry = { ...baseEntry, model_id: "deepseek-v4-pro", provider: "deepseek", is_default: false };
    expect(ds.provider).toBe("deepseek");
  });
});

describe("CreateModelCatalogRequest", () => {
  it("requires model_id, display_name, provider", () => {
    const req: CreateModelCatalogRequest = {
      model_id: "claude-sonnet-5",
      display_name: "Claude Sonnet 5",
      provider: "anthropic",
    };
    expect(req.model_id).toBe("claude-sonnet-5");
    expect(req.provider).toBe("anthropic");
  });
});

describe("UpdateModelCatalogRequest", () => {
  it("allows partial update (display_name only)", () => {
    const req: UpdateModelCatalogRequest = { display_name: "Claude Sonnet 4.6 Renamed" };
    expect(req.display_name).toBe("Claude Sonnet 4.6 Renamed");
    expect(req.is_active).toBeUndefined();
  });

  it("allows retiring a model", () => {
    const req: UpdateModelCatalogRequest = { is_active: false };
    expect(req.is_active).toBe(false);
  });

  it("allows setting as default", () => {
    const req: UpdateModelCatalogRequest = { is_default: true };
    expect(req.is_default).toBe(true);
  });
});
