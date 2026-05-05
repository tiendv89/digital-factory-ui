"use client";
import { useConnectForm } from "./ConnectForm.context";
import { Link2, Lock, Globe, KeyRound, AlertCircle } from "lucide-react";
export function ConnectForm() {
  const { repoInput, pat, visibility, error, submitting, setRepoInput, setPat, setVisibility, handleSubmit } = useConnectForm();
  return (
    <div className="w-full max-w-[680px]">
      <div className="mb-8 text-center">
        <h1 className="text-[30px] font-bold leading-9 tracking-[-0.75px] text-text-primary">Welcome back!</h1>
        <p className="mt-2 text-base leading-6 text-text-secondary">Connect a repository to view your workflow board.</p>
      </div>
      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold text-text-primary">Import from Repository</span>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border bg-surface-subtle p-0.5">
              <button type="button" onClick={() => setVisibility("public")}
                className={"flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors " + (visibility === "public" ? "bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary")}>
                <Globe className="h-3 w-3" />Public
              </button>
              <button type="button" onClick={() => setVisibility("private")}
                className={"flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors " + (visibility === "private" ? "bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary")}>
                <Lock className="h-3 w-3" />Private
              </button>
            </div>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex gap-2">
              <input type="text" value={repoInput} onChange={(e) => setRepoInput(e.target.value)}
                placeholder="https://github.com/owner/repo" disabled={submitting}
                className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                aria-label="Repository URL or owner/repo" />
              <button type="submit" disabled={submitting || !repoInput.trim()}
                className="flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? (<><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Importing&hellip;</>) : "Import"}
              </button>
            </div>
            {visibility === "private" && (
              <div className="mt-3">
                <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
                  <KeyRound className="h-4 w-4 shrink-0 text-text-muted" />
                  <input type="password" value={pat} onChange={(e) => setPat(e.target.value)}
                    placeholder="GitHub Personal Access Token (PAT)" disabled={submitting}
                    className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50"
                    aria-label="GitHub Personal Access Token" />
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-xs text-text-muted">
                  <span className="font-medium text-text-secondary">i</span>
                  Required to access your private repositories and associated metadata.
                </p>
              </div>
            )}
            {error && (
              <div role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-danger-bg bg-danger-bg px-3 py-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <p className="text-xs text-danger">{error}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
