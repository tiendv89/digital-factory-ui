export interface WorkspaceRepo {
  id: string;
  github: string;
  local_path: string;
  base_branch: string;
  owner_role: string;
}

export interface WorkspaceConfig {
  workspace_id: string;
  name: string;
  overview_doc?: string;
  management_repo: string;
  repos: WorkspaceRepo[];
  roles?: string[];
}

export interface WorkspaceSummary {
  workspaceId: string;
  name: string;
  rootPath: string;
  totalFeatures: number;
  inProgressFeatures: number;
  blockedFeatures: number;
  doneFeatures: number;
}
