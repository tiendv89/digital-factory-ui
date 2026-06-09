import type {
  MeData,
  MeResponse,
  MembersResponse,
  InvitationsResponse,
  DataEnvelope,
  InviteRequest,
  UpdateMeRequest,
  RoleChangeRequest,
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

export async function changeOrgMemberRole(
  orgId: string,
  userId: string,
  body: RoleChangeRequest,
): Promise<void> {
  const res = await fetch(
    `${getUserServiceBase()}/api/orgs/${orgId}/members/${userId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to change member role: ${res.status}`);
  }
}
