"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { parseRepoInput } from "@/features/workspaces/lib/parseRepoInput";
import { saveWorkspace } from "@/services/workspace-store";

type Visibility = "public" | "private";

interface ConnectFormState {
  repoInput: string;
  pat: string;
  visibility: Visibility;
  error: string | null;
  submitting: boolean;
  setRepoInput: (v: string) => void;
  setPat: (v: string) => void;
  setVisibility: (v: Visibility) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

const ConnectFormContext = createContext<ConnectFormState | null>(null);

export function ConnectFormProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [repoInput, setRepoInput] = useState("");
  const [pat, setPat] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const parsed = parseRepoInput(repoInput);
      if (!parsed) {
        setError("Invalid repository format. Use owner/repo, a GitHub URL, or SSH format.");
        return;
      }

      const token = visibility === "private" ? pat.trim() : undefined;
      if (visibility === "private" && !token) {
        setError("A Personal Access Token is required for private repositories.");
        return;
      }

      setSubmitting(true);
      try {
        const headers: Record<string, string> = {
          Accept: "application/vnd.github+json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
          { headers },
        );

        if (res.status === 401 || res.status === 403) {
          setError("Access denied. Check your PAT or repository visibility.");
          return;
        }

        if (res.status === 404) {
          setError("Repository not found. Check the name or your access token.");
          return;
        }

        if (!res.ok) {
          setError("GitHub API error. Please try again.");
          return;
        }

        const repoData = (await res.json()) as { name?: string };
        saveWorkspace({
          id: crypto.randomUUID(),
          owner: parsed.owner,
          repo: parsed.repo,
          name: repoData.name ?? parsed.repo,
          isPrivate: visibility === "private",
          pat: token,
          connectedAt: new Date().toISOString(),
        });

        router.push("/board");
      } catch {
        setError("Network error. Please check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [repoInput, pat, visibility, router],
  );

  return (
    <ConnectFormContext.Provider
      value={{
        repoInput,
        pat,
        visibility,
        error,
        submitting,
        setRepoInput,
        setPat,
        setVisibility,
        handleSubmit,
      }}
    >
      {children}
    </ConnectFormContext.Provider>
  );
}

export function useConnectForm(): ConnectFormState {
  const ctx = useContext(ConnectFormContext);
  if (!ctx) throw new Error("useConnectForm must be used inside ConnectFormProvider");
  return ctx;
}
