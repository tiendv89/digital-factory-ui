import axios from "axios";

import { getBffBaseUrl, userServiceApi } from "@/constants/axios";

import type {
  CallerWorkspaceRoleResponse,
  ChangeOrgMemberRoleRequest,
  CreateOrgRequest,
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
  UpdateMeRequest,
  UpdateOrgRequest,
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
  // Logout is owned by the BFF at the bare origin (not under a service prefix).
  await axios.post(`${getBffBaseUrl()}/auth/logout`, null, { withCredentials: true }).catch(() => undefined);
}

export async function updateMe(body: UpdateMeRequest): Promise<MeResponse> {
  try {
    const { data } = await userServiceApi.patch<MeResponse>("/api/me", body);
    return data;
  } catch (err) {
    handleApiError(err, "Failed to update /api/me");
  }
}

// Workspace-level member/invitation management has been removed; members and
// invitations are managed at the org level (see the fetchOrg* functions below).

// ─── Org-admin client methods ─────────────────────────────────────────────────

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

// ─── Workspace member/role reads (T5/T8) ─────────────────────────────────────

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

export async function getCallerWorkspaceRole(workspaceId: string): Promise<"member" | "admin"> {
  try {
    const { data } = await userServiceApi.get<CallerWorkspaceRoleResponse | { data: CallerWorkspaceRoleResponse }>(`/api/workspaces/${workspaceId}/me/role`);
    const body = "data" in data ? data.data : data;
    return body.role;
  } catch (err) {
    handleApiError(err, "Failed to get caller workspace role");
  }
}
