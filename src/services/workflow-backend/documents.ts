import axios from "axios";

import { workflowApi } from "@/constants/axios";

export type DocumentContent = {
  content: string;
  sha: string;
  url: string;
};

export type SaveDocumentResult = {
  pr_url: string;
  commit_sha: string;
};

export class StaleDocumentError extends Error {
  constructor() {
    super("Document changed since it was opened");
    this.name = "StaleDocumentError";
  }
}

export type DocumentPrStatus = {
  state: "none" | "open" | "merged";
  url: string | null;
};

export async function getDocumentContent(workspaceId: string, featureId: string, documentType: "product_spec" | "technical_design" | "tasks" | "handoff"): Promise<DocumentContent> {
  const res = await workflowApi.get<{
    success: boolean;
    data: DocumentContent;
  }>(`/api/workspaces/${workspaceId}/features/${featureId}/documents/${documentType}/content`);
  return res.data.data;
}

export async function saveDocument(workspaceId: string, featureId: string, documentType: "product_spec" | "technical_design", content: string, baseSha: string | null): Promise<SaveDocumentResult> {
  try {
    const res = await workflowApi.put<{
      success: boolean;
      data: { commit_sha: string; url: string; pr_url: string; pr_number: number; pr_state: string };
    }>(`/api/workspaces/${workspaceId}/features/${featureId}/documents/${documentType}/content`, {
      content,
      base_sha: baseSha,
    });
    const data = res.data.data;
    return { pr_url: data.pr_url ?? "", commit_sha: data.commit_sha };
  } catch (err) {
    // A stale base_sha is rejected by the backend with 409 (GITHUB_CONFLICT).
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      throw new StaleDocumentError();
    }
    throw err;
  }
}

export async function getDocumentPrStatus(workspaceId: string, featureId: string): Promise<DocumentPrStatus> {
  const res = await workflowApi.get<{
    success: boolean;
    data: DocumentPrStatus;
  }>(`/api/workspaces/${workspaceId}/features/${featureId}/documents/pr`);
  return res.data.data;
}
