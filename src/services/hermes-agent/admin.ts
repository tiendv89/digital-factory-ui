import { getBffBaseUrl } from "@/constants/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModelCatalogEntry = {
  model_id: string;
  display_name: string;
  provider: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateModelCatalogRequest = {
  model_id: string;
  display_name: string;
  provider: string;
};

export type UpdateModelCatalogRequest = {
  display_name?: string;
  is_active?: boolean;
  is_default?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAdminBase(): string {
  return `${getBffBaseUrl()}/bff/hermes-agent/api/v1/admin`;
}

async function handleResponse<T>(res: Response, context: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${context} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

// ─── Catalog CRUD ─────────────────────────────────────────────────────────────

export async function adminListModels(): Promise<ModelCatalogEntry[]> {
  const res = await fetch(`${getAdminBase()}/models`, {
    credentials: "include",
  });
  const body = await handleResponse<{ models: ModelCatalogEntry[] }>(res, "adminListModels");
  return body.models ?? [];
}

export async function adminCreateModel(body: CreateModelCatalogRequest): Promise<ModelCatalogEntry> {
  const res = await fetch(`${getAdminBase()}/models`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await handleResponse<{ model: ModelCatalogEntry }>(res, "adminCreateModel");
  return data.model;
}

export async function adminUpdateModel(modelId: string, body: UpdateModelCatalogRequest): Promise<ModelCatalogEntry> {
  const res = await fetch(`${getAdminBase()}/models/${encodeURIComponent(modelId)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await handleResponse<{ model: ModelCatalogEntry }>(res, "adminUpdateModel");
  return data.model;
}
