"use client";
import { useConnectForm } from "./ConnectForm.context";
import { Link2, AlertCircle } from "lucide-react";
export function ConnectForm() {
  const {
    repoUrl,
    defaultBranch,
    name,
    error,
    errorField,
    submitting,
    setRepoUrl,
    setDefaultBranch,
    setName,
    handleSubmit,
  } = useConnectForm();
  return (
    <div className="w-full max-w-[680px]">
      <div className="mb-8 text-center">
        <h1 className="text-[30px] font-bold leading-9 tracking-[-0.75px] text-text-primary">
          Welcome back!
        </h1>
        <p className="mt-2 text-base leading-6 text-text-secondary">
          Connect a repository to view your workflow board.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold text-text-primary">
                Import from Repository
              </span>
            </div>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex gap-2">
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                disabled={submitting}
                aria-label="Repository URL"
                aria-invalid={errorField === "repo_url" ? "true" : "false"}
                className={
                  "flex-1 rounded-md border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 " +
                  (errorField === "repo_url"
                    ? "border-danger focus:border-danger"
                    : "border-border focus:border-primary")
                }
              />
              <button
                type="submit"
                disabled={submitting || !repoUrl.trim()}
                className="flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Importing&hellip;
                  </>
                ) : (
                  "Import"
                )}
              </button>
            </div>
            {errorField === "repo_url" && (
              <p role="alert" className="mt-1.5 text-xs text-danger">
                {error}
              </p>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Default Branch{" "}
                  <span className="text-text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  placeholder="main"
                  disabled={submitting}
                  aria-label="Default branch"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Name <span className="text-text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Workspace name"
                  disabled={submitting}
                  aria-label="Workspace name"
                  aria-invalid={errorField === "name" ? "true" : "false"}
                  className={
                    "w-full rounded-md border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 " +
                    (errorField === "name"
                      ? "border-danger focus:border-danger"
                      : "border-border focus:border-primary")
                  }
                />
                {errorField === "name" && (
                  <p role="alert" className="mt-1.5 text-xs text-danger">
                    {error}
                  </p>
                )}
              </div>
            </div>
            {error && errorField == null && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-md border border-danger-bg bg-danger-bg px-3 py-2"
              >
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
