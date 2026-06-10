export interface MeUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeMembership {
  organization_id: string;
  organization_slug: string;
  organization_name: string;
  role: string;
  member_count: number;
  workspace_count: number;
}

export interface MeData {
  user: MeUser;
  memberships: MeMembership[];
  org_workspace_ids: Record<string, string[]>;
}

export interface MeResponse {
  data: MeData;
}

export interface Member {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
}

export interface MembersResponse {
  members: Member[];
}

export interface InvitationsResponse {
  invitations: Invitation[];
}

export interface DataEnvelope<T> {
  data: T;
}

export interface InviteRequest {
  email: string;
  role: string;
}

export interface UpdateMeRequest {
  display_name?: string | null;
}

export interface RoleChangeRequest {
  role: "member" | "admin";
}

// ─── Org-admin types ──────────────────────────────────────────────────────────

export type OrgRole = "member" | "admin" | "platform_admin";

export interface Org {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface OrgMember {
  user_id: string;
  email: string;
  display_name: string | null;
  role: OrgRole;
  joined_at: string;
}

export interface OrgInvitation {
  id: string;
  email: string;
  role: OrgRole;
  expires_at: string;
}

export interface OrgWorkspace {
  id: string;
  name: string;
  slug: string;
}

export interface CreateOrgRequest {
  name: string;
  slug: string;
}

export interface OrgResponse {
  data: Org;
}

export interface OrgMembersResponse {
  members: OrgMember[];
}

export interface OrgInvitationsResponse {
  invitations: OrgInvitation[];
}

export interface OrgWorkspacesResponse {
  workspaces: OrgWorkspace[];
}

export interface UpdateOrgRequest {
  name?: string;
  slug?: string;
}

export interface OrgInviteRequest {
  email: string;
  role: OrgRole;
}

export interface ChangeOrgMemberRoleRequest {
  role: "member" | "admin";
}

export interface TransferOrgOwnershipRequest {
  new_owner_user_id: string;
}
