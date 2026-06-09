import type {
  MeData,
  MeResponse,
  MembersResponse,
  InvitationsResponse,
  DataEnvelope,
  InviteRequest,
  UpdateMeRequest,
  RoleChangeRequest,
  Org,
  OrgResponse,
  OrgMember,
  OrgMembersResponse,
  OrgInvitation,
  OrgInvitationsResponse,
  OrgWorkspace,
  OrgWorkspacesResponse,
  UpdateOrgRequest,
  OrgInviteRequest,
  ChangeOrgMemberRoleRequest,
  TransferOrgOwnershipRequest,
} from "./types";

export function getUserServiceBase(): string {
  const base =
    process.env.NEXT_PUBLIC_USER_SERVICE_URL ??
    "https://workflow-user-service-api.kitelabs.io";
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_USER_SERVICE_URL is required for user-service API calls",
    );
  }
  return base;
}

export function getMeData(response: MeResponse | MeData): MeData {
  return "data" in response ? response.data : response;
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch(`${getUserServiceBase()}/api/me`, {
    credentials: "include",
  });
  if (res.status === 401) {
    const err = new Error("Unauthenticated") as Error & { status: number };
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch /api/me: ${res.status}`);
  }
  return res.json() as Promise<MeResponse>;
}

export async function logout(): Promise<void> {
  await fetch(`${getUserServiceBase()}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function updateMe(body: UpdateMeRequest): Promise<MeResponse> {
  const res = await fetch(`${getUserServiceBase()}/api/me`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Failed to update /api/me: ${res.status}`);
  }
  return res.json() as Promise<MeResponse>;
}

export async function fetchWorkspaceMembers(
  workspaceId: string,
): Promise<MembersResponse> {
  const res = await fetch(
    `${getUserServiceBase()}/api/admin/workspace/${workspaceId}/members`,
    { credentials: "include" },
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch members: ${res.status}`);
  }
  const json = (await res.json()) as DataEnvelope<MembersResponse> | MembersResponse;
  return "data" in json ? json.data : json;
}

export async function fetchWorkspaceInvitations(
  workspaceId: string,
): Promise<InvitationsResponse> {
  const res = await fetch(
    `${getUserServiceBase()}/api/admin/workspace/${workspaceId}/invitations`,
    { credentials: "include" },
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch invitations: ${res.status}`);
  }
  const json = (await res.json()) as DataEnvelope<InvitationsResponse> | InvitationsResponse;
  return "data" in json ? json.data : json;
}

export async function inviteMember(
  workspaceId: string,
  body: InviteRequest,
): Promise<void> {
  const res = await fetch(
    `${getUserServiceBase()}/api/admin/workspace/${workspaceId}/invitations`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to invite member: ${res.status}`);
  }
}

export async function removeMember(
  workspaceId: string,
  userId: string,
): Promise<void> {
  const res = await fetch(
    `${getUserServiceBase()}/api/admin/workspace/${workspaceId}/members/${userId}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) {
    throw new Error(`Failed to remove member: ${res.status}`);
  }
}

export async function cancelInvitation(
  workspaceId: string,
  invitationId: string,
): Promise<void> {
  const res = await fetch(
    `${getUserServiceBase()}/api/admin/workspace/${workspaceId}/invitations/${invitationId}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) {
    throw new Error(`Failed to cancel invitation: ${res.status}`);
  }
}

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

function unwrapOrgWorkspaces(json: OrgWorkspacesResponse | { data: OrgWorkspacesResponse }): OrgWorkspace[] {
  const body = "data" in json ? json.data : json;
  return body.workspaces;
}

async function throwIfNotOk(res: Response, context: string): Promise<void> {
  if (!res.ok) {
    let message = `${context}: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      if (body.error ?? body.message) message = (body.error ?? body.message)!;
    } catch {
      /* ignore parse failure */
    }
    const err = new Error(message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
}

export async function fetchOrg(orgId: string): Promise<Org> {
  const res = await fetch(`${getUserServiceBase()}/api/orgs/${orgId}`, {
    credentials: "include",
  });
  await throwIfNotOk(res, "Failed to fetch org");
  return unwrapOrg((await res.json()) as OrgResponse | Org);
}

export async function updateOrg(orgId: string, body: UpdateOrgRequest): Promise<Org> {
  const res = await fetch(`${getUserServiceBase()}/api/orgs/${orgId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res, "Failed to update org");
  return unwrapOrg((await res.json()) as OrgResponse | Org);
}

export async function fetchOrgMembers(orgId: string): Promise<OrgMember[]> {
  const res = await fetch(`${getUserServiceBase()}/api/orgs/${orgId}/members`, {
    credentials: "include",
  });
  await throwIfNotOk(res, "Failed to fetch org members");
  return unwrapOrgMembers((await res.json()) as OrgMembersResponse | { data: OrgMembersResponse });
}

export async function fetchOrgInvitations(orgId: string): Promise<OrgInvitation[]> {
  const res = await fetch(`${getUserServiceBase()}/api/orgs/${orgId}/invitations`, {
    credentials: "include",
  });
  await throwIfNotOk(res, "Failed to fetch org invitations");
  return unwrapOrgInvitations((await res.json()) as OrgInvitationsResponse | { data: OrgInvitationsResponse });
}

export async function inviteOrgMember(orgId: string, body: OrgInviteRequest): Promise<void> {
  const res = await fetch(`${getUserServiceBase()}/api/orgs/${orgId}/invitations`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res, "Failed to invite org member");
}

export async function changeOrgMemberRole(
  orgId: string,
  userId: string,
  body: ChangeOrgMemberRoleRequest | RoleChangeRequest,
): Promise<void> {
  const res = await fetch(`${getUserServiceBase()}/api/orgs/${orgId}/members/${userId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res, "Failed to change member role");
}

export async function removeOrgMember(orgId: string, userId: string): Promise<void> {
  const res = await fetch(`${getUserServiceBase()}/api/orgs/${orgId}/members/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await throwIfNotOk(res, "Failed to remove org member");
}

export async function cancelOrgInvitation(orgId: string, invitationId: string): Promise<void> {
  const res = await fetch(`${getUserServiceBase()}/api/orgs/${orgId}/invitations/${invitationId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await throwIfNotOk(res, "Failed to cancel org invitation");
}

export async function fetchOrgWorkspaces(orgId: string): Promise<OrgWorkspace[]> {
  const res = await fetch(`${getUserServiceBase()}/api/orgs/${orgId}/workspaces`, {
    credentials: "include",
  });
  await throwIfNotOk(res, "Failed to fetch org workspaces");
  return unwrapOrgWorkspaces((await res.json()) as OrgWorkspacesResponse | { data: OrgWorkspacesResponse });
}

export async function transferOrgOwnership(
  orgId: string,
  body: TransferOrgOwnershipRequest,
): Promise<void> {
  const res = await fetch(`${getUserServiceBase()}/api/orgs/${orgId}/transfer`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res, "Failed to transfer org ownership");
}

export async function deleteOrg(orgId: string): Promise<void> {
  const res = await fetch(`${getUserServiceBase()}/api/orgs/${orgId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await throwIfNotOk(res, "Failed to delete org");
}
