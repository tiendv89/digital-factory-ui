import { getBffBaseUrl } from "@/constants/axios";

export type HermesTool = {
  name: string;
  description: string;
};

export type StageTransitionAction = "approve" | "reject" | "reopen";

export type StageTransitionRequest = {
  stage: string;
  action: StageTransitionAction;
  comment?: string;
};

export type StageTransitionResponse = {
  ok: boolean;
  feature_id: string;
  stage: string;
  action: StageTransitionAction;
};

function getApiBase(): string {
  return `${getBffBaseUrl()}/bff/hermes-agent`;
}

export async function listTools(): Promise<HermesTool[]> {
  const res = await fetch(`${getApiBase()}/api/v1/tools`, { credentials: "include" });
  if (!res.ok) throw new Error(`listTools failed (${res.status})`);
  const body = (await res.json()) as { tools: HermesTool[] };
  return body.tools ?? [];
}

export async function stageTransition(featureId: string, req: StageTransitionRequest): Promise<StageTransitionResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/features/${featureId}/stage-transition`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`stageTransition failed (${res.status}): ${text}`);
  }
  return (await res.json()) as StageTransitionResponse;
}
