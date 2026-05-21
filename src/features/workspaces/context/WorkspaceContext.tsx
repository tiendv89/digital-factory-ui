"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getWorkspace,
  importWorkspace as apiImportWorkspace,
  type ApiError,
  type ImportWorkspaceRequest,
  type LocalWorkspaceSummary,
  type WorkspaceDetail,
} from "@/services/workflow-backend";
import {
  getLocalWorkspaceSummaries,
  getSelectedWorkspaceId,
  saveLocalWorkspaceSummary,
  removeLocalWorkspaceSummary,
  setSelectedWorkspaceId,
} from "@/services/local-workspace-store";

export type WorkspaceContextValue = {
  summaries: LocalWorkspaceSummary[];
  selectedWorkspaceId: string | null;
  activeWorkspace: WorkspaceDetail | null;
  loadingWorkspace: boolean;
  workspaceError: ApiError | null;
  importingWorkspace: boolean;
  importError: ApiError | null;

  selectWorkspace: (workspaceId: string) => void;
  importWorkspace: (body: ImportWorkspaceRequest) => Promise<void>;
  clearImportError: () => void;
  removeLocalSummary: (workspaceId: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [summaries, setSummaries] = useState<LocalWorkspaceSummary[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceIdState] = useState<string | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<ApiError | null>(null);
  const [importingWorkspace, setImportingWorkspace] = useState(false);
  const [importError, setImportError] = useState<ApiError | null>(null);

  useEffect(() => {
    const storedSummaries = getLocalWorkspaceSummaries();
    const storedId = getSelectedWorkspaceId();
    setSummaries(storedSummaries);

    const workspaceId =
      storedId ??
      storedSummaries.sort(
        (a, b) =>
          new Date(b.last_opened_at).getTime() -
          new Date(a.last_opened_at).getTime(),
      )[0]?.workspaceId ??
      null;

    if (workspaceId) {
      setSelectedWorkspaceIdState(workspaceId);
      loadWorkspace(workspaceId);
    }
  }, []);

  const loadWorkspace = useCallback((workspaceId: string) => {
    setLoadingWorkspace(true);
    setWorkspaceError(null);
    getWorkspace(workspaceId)
      .then((detail) => {
        setActiveWorkspace(detail);
        setLoadingWorkspace(false);
      })
      .catch((err: ApiError) => {
        setWorkspaceError(err);
        setLoadingWorkspace(false);
      });
  }, []);

  const selectWorkspace = useCallback(
    (workspaceId: string) => {
      setSelectedWorkspaceIdState(workspaceId);
      setSelectedWorkspaceId(workspaceId);
      setActiveWorkspace(null);

      const summary = summaries.find((s) => s.workspaceId === workspaceId);
      if (summary) {
        const updated: LocalWorkspaceSummary = {
          ...summary,
          last_opened_at: new Date().toISOString(),
        };
        saveLocalWorkspaceSummary(updated);
        setSummaries(getLocalWorkspaceSummaries());
      }

      loadWorkspace(workspaceId);
    },
    [summaries, loadWorkspace],
  );

  const importWorkspaceFn = useCallback(
    async (body: ImportWorkspaceRequest) => {
      setImportingWorkspace(true);
      setImportError(null);
      try {
        const detail = await apiImportWorkspace(body);

        const repoUrl = body.repo_url;
        const urlParts = repoUrl.replace(/\.git$/, "").split("/");
        const repoName = urlParts[urlParts.length - 1] ?? repoUrl;

        const summary: LocalWorkspaceSummary = {
          workspaceId: detail.id,
          name: detail.name || body.name || repoName,
          repo_url: body.repo_url,
          default_branch: body.default_branch ?? "main",
          last_opened_at: new Date().toISOString(),
        };
        saveLocalWorkspaceSummary(summary);
        setSelectedWorkspaceId(detail.id);
        setSummaries(getLocalWorkspaceSummaries());
        setSelectedWorkspaceIdState(detail.id);
        setActiveWorkspace(detail);
      } catch (err) {
        setImportError(err as ApiError);
        throw err;
      } finally {
        setImportingWorkspace(false);
      }
    },
    [],
  );

  const clearImportError = useCallback(() => {
    setImportError(null);
  }, []);

  const removeLocalSummary = useCallback((workspaceId: string) => {
    removeLocalWorkspaceSummary(workspaceId);
    setSummaries(getLocalWorkspaceSummaries());
    if (selectedWorkspaceId === workspaceId) {
      const remaining = getLocalWorkspaceSummaries();
      const next = remaining[0] ?? null;
      if (next) {
        setSelectedWorkspaceIdState(next.workspaceId);
        setSelectedWorkspaceId(next.workspaceId);
        loadWorkspace(next.workspaceId);
      } else {
        setSelectedWorkspaceIdState(null);
        setActiveWorkspace(null);
      }
    }
  }, [selectedWorkspaceId, loadWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        summaries,
        selectedWorkspaceId,
        activeWorkspace,
        loadingWorkspace,
        workspaceError,
        importingWorkspace,
        importError,
        selectWorkspace,
        importWorkspace: importWorkspaceFn,
        clearImportError,
        removeLocalSummary,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspaceContext must be used within a WorkspaceProvider");
  }
  return ctx;
}
