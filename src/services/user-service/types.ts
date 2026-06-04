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
