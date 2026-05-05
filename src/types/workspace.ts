export type StoredWorkspace = {
  id: string;
  owner: string;
  repo: string;
  name: string;
  isPrivate: boolean;
  pat?: string;
  connectedAt: string;
};
