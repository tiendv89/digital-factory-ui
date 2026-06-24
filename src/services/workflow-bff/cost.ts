import { getBffBaseUrl } from "@/constants/axios";

export type TurnCostEntry = {
  turn_id: string;
  credits_used: number;
  model_id: string;
  tokens: {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
  };
  stopped: boolean;
};

export type SessionQuota = {
  daily_used: number;
  daily_cap: number;
  weekly_used: number;
  weekly_cap: number;
  plan_name: string;
  daily_reset_at: string;
  weekly_reset_at: string;
};

export type SessionCostResponse = {
  session_credits: number;
  turn_count: number;
  quota: SessionQuota;
  turns: TurnCostEntry[];
};

function getBffCostBase(): string {
  return getBffBaseUrl();
}

export async function getSessionCost(sessionId: string): Promise<SessionCostResponse> {
  const res = await fetch(`${getBffCostBase()}/sessions/${encodeURIComponent(sessionId)}/cost`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`getSessionCost failed (${res.status})`);
  }
  return (await res.json()) as SessionCostResponse;
}
