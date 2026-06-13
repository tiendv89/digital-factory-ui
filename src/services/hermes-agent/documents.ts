import { getBffBaseUrl } from "@/constants/axios";

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

function getApiBase(): string {
  return `${getBffBaseUrl()}/bff/hermes-agent`;
}

export async function saveDocument(
  featureId: string,
  document: "product_spec" | "technical_design",
  content: string,
  baseSha: string | null,
): Promise<SaveDocumentResult> {
  const res = await fetch(
    `${getApiBase()}/api/v1/features/${featureId}/document`,
    {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ document, content, base_sha: baseSha }),
    },
  );

  if (res.status === 409) {
    throw new StaleDocumentError();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`saveDocument failed (${res.status}): ${text}`);
  }

  return (await res.json()) as SaveDocumentResult;
}
