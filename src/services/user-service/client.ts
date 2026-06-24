import axios from "axios";

import { getBffBaseUrl, userServiceApi } from "@/constants/axios";

import type {
  ActiveSession,
  AdminOrg,
  AdminOrgsResponse,
  AdminUsersResponse,
  AssignOrgPlanRequest,
  AssignUserPlanRequest,
  BillingPlan,
  BillingPlanResponse,
  BillingPlansResponse,
  CallerWorkspaceRoleResponse,
  ChangeOrgMemberRoleRequest,
  CreateBillingPlanRequest,
  CreateOrgRequest,
  EffectivePlan,
  EffectivePlanResponse,
  MeData,
  MeResponse,
  Org,
  OrgInvitation,
  OrgInvitationsResponse,
  OrgInviteRequest,
  OrgMember,
  OrgMembersResponse,
  OrgResponse,
  RoleChangeRequest,
  TransferOrgOwnershipRequest,
  UpdateBillingPlanRequest,
  UpdateMeRequest,
  UpdateOrgRequest,
  UserQuota,
  UserQuotaResponse,
  WorkspaceMember,
  WorkspaceMembersResponse,
} from "./types";

export function getMeData(response: MeResponse | MeData): MeData {
  return "data" in response ? response.data : response;
}

function handleApiError(err: unknown, context: string): never {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string; message?: string } | undefined;
    const message = body?.error ?? body?.message ?? `${context}: ${err.response?.status}`;
    const e = new Error(message) as Error & { status: number };
    e.status = err.response?.status ?? 0;
    throw e;
  }
  throw err;
}

export async function fetchMe(): Promise<MeResponse> {
  try {
    const { data } = await userServiceApi.get<MeResponse>("/api/me");
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      const e = new Error("Unauthenticated") as Error & { status: number };
      e.status = 401;
      throw e;
    }
    throw err;
  }
}

export async function logout(): Promise<void> {
  await axios.post(`${getBffBaseUrl()}/auth/logout`, null, { withCredentials: true }).catch(() => undefined);
}

/** listActiveSessions returns the current user's active BFF sessions. */
export async function listActiveSessions(): Promise<ActiveSession[]> {
  try {
    const { data } = await axios.get<{ sessions: ActiveSession[] }>(`${getBffBaseUrl()}/bff/account/sessions`, {
      withCredentials: true,
    });
    return data.sessions ?? [];
  } catch (err) {
    handleApiError(err, "list active sessions");
  }
}

/** revokeSession revokes a single session by id. */
export async function revokeSession(sessionId: string): Promise<void> {
  try {
    await axios.delete(`${getBffBaseUrl()}/bff/account/sessions/${encodeURIComponent(sessionId)}`, {
      withCredentials: true,
    });
  } catch (err) {
    handleApiError(err, "revoke session");
  }
}

/** logoutAllDevices revokes every session for the current user. */
export async function logoutAllDevices(): Promise<void> {
  try {
    await axios.delete(`${getBffBaseUrl()}/bff/account/sessions`, {
      withCredentials: true,
    });
  } catch (err) {
    handleApiError(err, "log out of all devices");
  }
}

export async function updateMe(body: UpdateMeRequest): Promise<MeResponse> {
  try {
    const { data } = await userServiceApi.patch<MeResponse>("/api/me", body);
    return data;
  } catch (err) {
    handleApiError(err, "Failed to update /api/me");
  }
}

function unwrapOrg(json: OrgResponse | Org): Org {
  return "data" in json ? json.data : json;
}

function unwrapOrgMembers(json: OrgMembersResponse | { data: OrgMembersResponse }): OrgMember[] {
  const body = "data" in json ? json.data : json;
  return body.members;
}

function unwrapOrgInvitations(json: OrgInvitationsResponse | { data: OrgInvitationsResponse }): OrgInvitation[] {
  const body = "data" in json ? json.data : json;
  return body.invitations;
}

export async function createOrg(body: CreateOrgRequest): Promise<Org> {
  try {
    const { data } = await userServiceApi.post<OrgResponse | Org>("/api/orgs", body);
    return unwrapOrg(data);
  } catch (err) {
    handleApiError(err, "Failed to create org");
  }
}

export async function fetchOrg(orgId: string): Promise<Org> {
  try {
    const { data } = await userServiceApi.get<OrgResponse | Org>(`/api/orgs/${orgId}`);
    return unwrapOrg(data);
  } catch (err) {
    handleApiError(err, "Failed to fetch org");
  }
}

export async function updateOrg(orgId: string, body: UpdateOrgRequest): Promise<Org> {
  try {
    const { data } = await userServiceApi.patch<OrgResponse | Org>(`/api/orgs/${orgId}`, body);
    return unwrapOrg(data);
  } catch (err) {
    handleApiError(err, "Failed to update org");
  }
}

export async function fetchOrgMembers(orgId: string): Promise<OrgMember[]> {
  try {
    const { data } = await userServiceApi.get<OrgMembersResponse | { data: OrgMembersResponse }>(`/api/orgs/${orgId}/members`);
    return unwrapOrgMembers(data);
  } catch (err) {
    handleApiError(err, "Failed to fetch org members");
  }
}

export async function fetchOrgInvitations(orgId: string): Promise<OrgInvitation[]> {
  try {
    const { data } = await userServiceApi.get<OrgInvitationsResponse | { data: OrgInvitationsResponse }>(`/api/orgs/${orgId}/invitations`);
    return unwrapOrgInvitations(data);
  } catch (err) {
    handleApiError(err, "Failed to fetch org invitations");
  }
}

export async function inviteOrgMember(orgId: string, body: OrgInviteRequest): Promise<void> {
  try {
    await userServiceApi.post(`/api/orgs/${orgId}/invitations`, body);
  } catch (err) {
    handleApiError(err, "Failed to invite org member");
  }
}

export async function changeOrgMemberRole(orgId: string, userId: string, body: ChangeOrgMemberRoleRequest | RoleChangeRequest): Promise<void> {
  try {
    await userServiceApi.patch(`/api/orgs/${orgId}/members/${userId}`, body);
  } catch (err) {
    handleApiError(err, "Failed to change member role");
  }
}

export async function removeOrgMember(orgId: string, userId: string): Promise<void> {
  try {
    await userServiceApi.delete(`/api/orgs/${orgId}/members/${userId}`);
  } catch (err) {
    handleApiError(err, "Failed to remove org member");
  }
}

export async function cancelOrgInvitation(orgId: string, invitationId: string): Promise<void> {
  try {
    await userServiceApi.delete(`/api/orgs/${orgId}/invitations/${invitationId}`);
  } catch (err) {
    handleApiError(err, "Failed to cancel org invitation");
  }
}

export async function transferOrgOwnership(orgId: string, body: TransferOrgOwnershipRequest): Promise<void> {
  try {
    await userServiceApi.post(`/api/orgs/${orgId}/transfer`, body);
  } catch (err) {
    handleApiError(err, "Failed to transfer org ownership");
  }
}

export async function deleteOrg(orgId: string): Promise<void> {
  try {
    await userServiceApi.delete(`/api/orgs/${orgId}`);
  } catch (err) {
    handleApiError(err, "Failed to delete org");
  }
}

function unwrapWorkspaceMembers(json: WorkspaceMembersResponse | { data: WorkspaceMembersResponse }): WorkspaceMember[] {
  const body = "data" in json ? json.data : json;
  return body.members;
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  try {
    const { data } = await userServiceApi.get<WorkspaceMembersResponse | { data: WorkspaceMembersResponse }>(`/api/workspaces/${workspaceId}/members`);
    return unwrapWorkspaceMembers(data);
  } catch (err) {
    handleApiError(err, "Failed to list workspace members");
  }
}

export async function fetchUserQuota(): Promise<UserQuota> {
  try {
    const { data } = await userServiceApi.get<UserQuotaResponse | UserQuota>("/users/me/quota");
    return "data" in data ? data.data : data;
  } catch (err) {
    handleApiError(err, "Failed to fetch /users/me/quota");
  }
}

export async function getCallerWorkspaceRole(workspaceId: string): Promise<"member" | "admin"> {
  try {
    const { data } = await userServiceApi.get<CallerWorkspaceRoleResponse | { data: CallerWorkspaceRoleResponse }>(`/api/workspaces/${workspaceId}/me/role`);
    const body = "data" in data ? data.data : data;
    return body.role;
  } catch (err) {
    handleApiError(err, "Failed to get caller workspace role");
  }
}

// ─── Admin Billing Plan Client Functions ────────────────────────────────────

function unwrapPlans(json: BillingPlansResponse | { data: BillingPlansResponse }): BillingPlan[] {
  const body = "data" in json ? json.data : json;
  return body.plans;
}

function unwrapPlan(json: BillingPlanResponse | { data: BillingPlanResponse }): BillingPlan {
  const body = "data" in json ? json.data : json;
  return body.plan;
}

function unwrapEffectivePlan(json: EffectivePlanResponse | { data: EffectivePlanResponse }): EffectivePlan {
  const body = "data" in json ? json.data : json;
  return body.effective_plan;
}

function unwrapAdminUsers(json: AdminUsersResponse | { data: AdminUsersResponse }): AdminUsersResponse {
  return "data" in json ? json.data : json;
}

function unwrapAdminOrgs(json: AdminOrgsResponse | { data: AdminOrgsResponse }): AdminOrgsResponse {
  return "data" in json ? json.data : json;
}

export async function adminListPlans(): Promise<BillingPlan[]> {
  try {
    const { data } = await userServiceApi.get<BillingPlansResponse | { data: BillingPlansResponse }>("/admin/plans");
    return unwrapPlans(data);
  } catch (err) {
    handleApiError(err, "Failed to list billing plans");
  }
}

export async function adminCreatePlan(body: CreateBillingPlanRequest): Promise<BillingPlan> {
  try {
    const { data } = await userServiceApi.post<BillingPlanResponse | { data: BillingPlanResponse }>("/admin/plans", body);
    return unwrapPlan(data);
  } catch (err) {
    handleApiError(err, "Failed to create billing plan");
  }
}

export async function adminUpdatePlan(planId: string, body: UpdateBillingPlanRequest): Promise<BillingPlan> {
  try {
    const { data } = await userServiceApi.patch<BillingPlanResponse | { data: BillingPlanResponse }>(`/admin/plans/${planId}`, body);
    return unwrapPlan(data);
  } catch (err) {
    handleApiError(err, "Failed to update billing plan");
  }
}

export async function adminListUsers(page = 1, pageSize = 50): Promise<AdminUsersResponse> {
  try {
    const { data } = await userServiceApi.get<AdminUsersResponse | { data: AdminUsersResponse }>("/admin/users", {
      params: { page, page_size: pageSize },
    });
    return unwrapAdminUsers(data);
  } catch (err) {
    handleApiError(err, "Failed to list admin users");
  }
}

export async function adminGetUserEffectivePlan(userId: string): Promise<EffectivePlan> {
  try {
    const { data } = await userServiceApi.get<EffectivePlanResponse | { data: EffectivePlanResponse }>(`/admin/users/${userId}/effective-plan`);
    return unwrapEffectivePlan(data);
  } catch (err) {
    handleApiError(err, "Failed to get user effective plan");
  }
}

export async function adminAssignUserPlan(userId: string, body: AssignUserPlanRequest): Promise<void> {
  try {
    await userServiceApi.post(`/admin/users/${userId}/plan`, body);
  } catch (err) {
    handleApiError(err, "Failed to assign user plan");
  }
}

export async function adminRemoveUserPlan(userId: string): Promise<void> {
  try {
    await userServiceApi.delete(`/admin/users/${userId}/plan`);
  } catch (err) {
    handleApiError(err, "Failed to remove user plan");
  }
}

export async function adminListOrgs(page = 1, pageSize = 50): Promise<AdminOrgsResponse> {
  try {
    const { data } = await userServiceApi.get<AdminOrgsResponse | { data: AdminOrgsResponse }>("/admin/orgs", {
      params: { page, page_size: pageSize },
    });
    return unwrapAdminOrgs(data);
  } catch (err) {
    handleApiError(err, "Failed to list admin orgs");
  }
}

export async function adminAssignOrgPlan(orgId: string, body: AssignOrgPlanRequest): Promise<void> {
  try {
    await userServiceApi.post(`/admin/orgs/${orgId}/plan`, body);
  } catch (err) {
    handleApiError(err, "Failed to assign org plan");
  }
}

export async function adminRemoveOrgPlan(orgId: string): Promise<void> {
  try {
    await userServiceApi.delete(`/admin/orgs/${orgId}/plan`);
  } catch (err) {
    handleApiError(err, "Failed to remove org plan");
  }
}
