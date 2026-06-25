interface MeUser {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  linked_providers: string[];
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
  platform_roles: string[];
}

export interface MeResponse {
  data: MeData;
}

export interface UpdateMeRequest {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

export interface RoleChangeRequest {
  role: "member" | "admin";
}

export type OrgRole = "member" | "admin";

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

export type WorkspaceRole = "member" | "admin";

export interface WorkspaceMember {
  user_id: string;
  display_name: string | null;
  email?: string | null;
  avatar_url: string | null;
  role: WorkspaceRole;
}

export interface WorkspaceMembersResponse {
  members: WorkspaceMember[];
}

export interface CallerWorkspaceRoleResponse {
  role: WorkspaceRole;
}

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  ip_address: string;
  created_at: number; // unix seconds
  last_seen_at: number; // unix seconds
  current: boolean;
}

export interface UserQuota {
  plan_name: string;
  daily_used: number;
  daily_cap: number;
  weekly_used: number;
  weekly_cap: number;
  daily_reset_at: string;
  weekly_reset_at: string;
}

export interface UserQuotaResponse {
  data: UserQuota;
}

// ─── Admin Billing Plan Types ─────────────────────────────────────────────────

export interface BillingPlan {
  id: string;
  name: string;
  display_name: string;
  // Matches user-service JSON. 0 = unlimited (rendered as ∞).
  daily_credits_cap: number;
  weekly_credits_cap: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBillingPlanRequest {
  name: string;
  display_name: string;
  daily_credits_cap: number;
  weekly_credits_cap: number;
}

export interface UpdateBillingPlanRequest {
  display_name?: string;
  daily_credits_cap?: number;
  weekly_credits_cap?: number;
}

export interface BillingPlansResponse {
  plans: BillingPlan[];
}

export interface BillingPlanResponse {
  plan: BillingPlan;
}

export interface EffectivePlan {
  plan: BillingPlan;
  source: "individual" | "org" | "free";
  assigned_at: string | null;
  expires_at: string | null;
}

export interface EffectivePlanResponse {
  effective_plan: EffectivePlan;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  effective_plan: EffectivePlan | null;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
}

export interface AssignUserPlanRequest {
  plan_id: string;
  expires_at?: string | null;
}

export interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  effective_plan: EffectivePlan | null;
}

export interface AdminOrgsResponse {
  orgs: AdminOrg[];
  total: number;
}

export interface AssignOrgPlanRequest {
  plan_id: string;
  expires_at?: string | null;
}
