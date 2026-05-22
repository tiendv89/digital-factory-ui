"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { getImportErrorMessage } from "@/features/workspaces/lib/importError";

interface ConnectFormState {
  repoUrl: string;
  defaultBranch: string;
  name: string;
  error: string | null;
  errorField?: "repo_url" | "name";
  submitting: boolean;
  setRepoUrl: (v: string) => void;
  setDefaultBranch: (v: string) => void;
  setName: (v: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

const ConnectFormContext = createContext<ConnectFormState | null>(null);

export function ConnectFormProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { importWorkspace, importingWorkspace, importError, clearImportError } =
    useWorkspaceContext();
  const [repoUrl, setRepoUrlState] = useState("");
  const [defaultBranch, setDefaultBranchState] = useState("");
  const [name, setNameState] = useState("");

  const parsedError = importError ? getImportErrorMessage(importError) : null;

  const setRepoUrl = useCallback(
    (v: string) => {
      setRepoUrlState(v);
      if (importError) clearImportError();
    },
    [importError, clearImportError],
  );

  const setDefaultBranch = useCallback(
    (v: string) => {
      setDefaultBranchState(v);
      if (importError) clearImportError();
    },
    [importError, clearImportError],
  );

  const setName = useCallback(
    (v: string) => {
      setNameState(v);
      if (importError) clearImportError();
    },
    [importError, clearImportError],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!repoUrl.trim()) return;
      try {
        await importWorkspace({
          repo_url: repoUrl.trim(),
          ...(defaultBranch.trim()
            ? { default_branch: defaultBranch.trim() }
            : {}),
          ...(name.trim() ? { name: name.trim() } : {}),
        });
        router.push("/board");
      } catch {
        // importError is already set in context
      }
    },
    [repoUrl, defaultBranch, name, importWorkspace, router],
  );

  return (
    <ConnectFormContext.Provider
      value={{
        repoUrl,
        defaultBranch,
        name,
        error: parsedError?.message ?? null,
        errorField: parsedError?.field,
        submitting: importingWorkspace,
        setRepoUrl,
        setDefaultBranch,
        setName,
        handleSubmit,
      }}
    >
      {children}
    </ConnectFormContext.Provider>
  );
}

export function useConnectForm(): ConnectFormState {
  const ctx = useContext(ConnectFormContext);
  if (!ctx)
    throw new Error("useConnectForm must be used inside ConnectFormProvider");
  return ctx;
}
