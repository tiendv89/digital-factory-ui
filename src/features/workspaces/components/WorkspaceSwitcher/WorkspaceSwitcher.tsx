"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { ImportModal } from "@/features/workspaces/components/ImportModal";
import type { LocalWorkspaceSummary } from "@/services/workflow-backend";

function WorkspaceItem({
  summary,
  isSelected,
  onSelect,
}: {
  summary: LocalWorkspaceSummary;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const initials = summary.name
    .split(/[\s-_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(summary.workspaceId)}
      className={
        "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-subtle " +
        (isSelected ? "bg-surface-subtle" : "")
      }
    >
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-purple text-[10px] font-bold text-white"
        aria-hidden="true"
      >
        {initials || "W"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-text-primary">{summary.name}</p>
        <p className="truncate text-[11px] text-text-muted">{summary.repo_url}</p>
      </div>
      {isSelected && (
        <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
      )}
    </button>
  );
}

export function WorkspaceSwitcher() {
  const { summaries, selectedWorkspaceId, selectWorkspace } = useWorkspaceContext();
  const [open, setOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filteredSummaries = summaries.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.repo_url.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = useCallback(
    (workspaceId: string) => {
      if (workspaceId !== selectedWorkspaceId) {
        selectWorkspace(workspaceId);
      }
      setOpen(false);
      setSearch("");
    },
    [selectedWorkspaceId, selectWorkspace],
  );

  const handleImportSuccess = useCallback(() => {
    setShowImport(false);
    setOpen(false);
    setSearch("");
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const activeSummary = summaries.find((s) => s.workspaceId === selectedWorkspaceId);

  return (
    <>
      <div ref={ref} className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Switch workspace"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
        >
          <span className="max-w-[120px] truncate">
            {activeSummary?.name ?? "Workspaces"}
          </span>
          <ChevronDown
            className={"h-3.5 w-3.5 shrink-0 transition-transform " + (open ? "rotate-180" : "")}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div
            role="listbox"
            aria-label="Available workspaces"
            className="absolute left-0 top-full z-40 mt-1 w-72 rounded-md border border-border bg-surface shadow-lg"
          >
            {summaries.length > 3 && (
              <div className="border-b border-border px-3 py-2">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search workspaces..."
                  autoFocus
                  className="w-full bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
                  aria-label="Search workspaces"
                />
              </div>
            )}

            {filteredSummaries.length > 0 ? (
              <div className="max-h-60 overflow-y-auto py-1">
                {filteredSummaries.map((s) => (
                  <WorkspaceItem
                    key={s.workspaceId}
                    summary={s}
                    isSelected={s.workspaceId === selectedWorkspaceId}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            ) : (
              <p className="px-3 py-3 text-xs text-text-muted">No workspaces found.</p>
            )}

            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSearch("");
                  setShowImport(true);
                }}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Import workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </>
  );
}
