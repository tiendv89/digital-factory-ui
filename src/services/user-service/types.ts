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
}

export interface MeData {
  user: MeUser;
  memberships: MeMembership[];
  accessible_workspace_ids: string[];
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

export interface InviteRequest {
  email: string;
  role: string;
}
