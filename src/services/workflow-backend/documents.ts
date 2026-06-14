import { workflowApi } from "@/constants/axios";

export type DocumentContent = {
  content: string;
  sha: string;
  url: string;
};

export type DocumentPrStatus = {
  state: "none" | "open" | "merged";
  url: string | null;
};

export async function getDocumentContent(workspaceId: string, featureId: string, documentType: "product_spec" | "technical_design" | "handoff"): Promise<DocumentContent> {
  const res = await workflowApi.get<{
    success: boolean;
    data: DocumentContent;
  }>(`/api/workspaces/${workspaceId}/features/${featureId}/documents/${documentType}/content`);
  return res.data.data;
}

export async function getDocumentPrStatus(workspaceId: string, featureId: string): Promise<DocumentPrStatus> {
  const res = await workflowApi.get<{
    success: boolean;
    data: DocumentPrStatus;
  }>(`/api/workspaces/${workspaceId}/features/${featureId}/documents/pr`);
  return res.data.data;
}
