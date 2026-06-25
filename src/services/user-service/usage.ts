import { userServiceApi } from "@/constants/axios";

/** One organization's usage + resolved plan for the current user. */
export type OrgUsage = {
  org_id: string;
  org_slug: string;
  org_name: string;
  role: string;
  plan_name: string;
  plan_display_name: string;
  daily_used: number;
  daily_cap: number;
  weekly_used: number;
  weekly_cap: number;
  daily_reset_at: string;
  weekly_reset_at: string;
};

type UsageResponse = { sections: OrgUsage[] };

/**
 * Fetch the caller's per-org usage from user-service (via the BFF proxy, which
 * injects identity). Pass orgId to filter to a single org (?org=…). Served by
 * handler.MeUsage.
 */
export async function getUsage(orgId?: string): Promise<OrgUsage[]> {
  const url = orgId ? `/api/me/usage?org=${encodeURIComponent(orgId)}` : "/api/me/usage";
  const { data } = await userServiceApi.get<UsageResponse | { data: UsageResponse }>(url);
  const body = "data" in data ? data.data : data;
  return body?.sections ?? [];
}
