"use client";

import { Check, ChevronDown, FolderOpen, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CreateWorkspaceModal } from "@/components/workspaces/create-workspace-modal";
import { ImportModal } from "@/components/workspaces/import-modal";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import type { WorkspaceSummary } from "@/services/workflow-backend";

const AVATAR_CLASSES = ["bg-purple", "bg-success", "bg-primary", "bg-warning", "bg-danger"];

function getWorkspaceInitials(name: string): string {
  return (
    name
      .split(/[\s-_]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "W"
  );
}

function getWorkspaceAvatarClass(summary: WorkspaceSummary): string {
  const seed = `${summary.id}${summary.name}`;
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_CLASSES[total % AVATAR_CLASSES.length] ?? "bg-purple";
}

function WorkspaceItem({ summary, isSelected, onSelect }: { summary: WorkspaceSummary; isSelected: boolean; onSelect: (id: string) => void }) {
  const initials = getWorkspaceInitials(summary.name);

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(summary.id)}
      className={"flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-surface-subtle " + (isSelected ? "bg-surface-subtle" : "")}
    >
      <div className={"flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[9px] font-bold text-white " + getWorkspaceAvatarClass(summary)} aria-hidden="true">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold leading-4 text-text-primary">{summary.name}</p>
        <p className="truncate text-[10px] leading-3 text-text-muted">{summary.repo_url}</p>
      </div>
      {isSelected && <Check className="h-3 w-3 shrink-0 text-success" aria-hidden="true" />}
    </button>
  );
}

export function WorkspaceSwitcher() {
  const { summaries, selectedWorkspaceId, selectWorkspace, goToBoard, activeSurface } = useWorkspaceContext();
  const [open, setOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filteredSummaries = summaries.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.repo_url.toLowerCase().includes(search.toLowerCase()));

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

  const handleGoToBoard = useCallback(() => {
    setOpen(false);
    setSearch("");
    goToBoard();
  }, [goToBoard]);

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

  const activeSummary = summaries.find((s) => s.id === selectedWorkspaceId);

  const isBoardActive = activeSurface === "board";

  return (
    <>
      <div ref={ref} className="relative">
        <div
          className={
            "flex h-8 w-60 overflow-hidden border text-left transition-colors " +
            (isBoardActive ? "border-success/60 bg-success-bg/35 hover:border-success hover:bg-success-bg/50" : "border-border bg-surface-secondary hover:bg-surface-subtle")
          }
        >
          <button type="button" aria-label="Back to kanban board" onClick={handleGoToBoard} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 text-left">
            <FolderOpen className={"h-4 w-4 shrink-0 " + (isBoardActive ? "text-success" : "text-text-muted")} strokeWidth={2} aria-hidden="true" />
            <span className="min-w-0 truncate text-xs font-semibold leading-none text-text-secondary">{activeSummary?.name ?? "Select workspace"}</span>
          </button>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label="Switch workspace"
            onClick={() => setOpen((v) => !v)}
            className={
              "ml-auto flex h-full w-8 shrink-0 items-center justify-center border-l transition-colors " +
              (isBoardActive ? "border-success/25 bg-success-bg/70 hover:bg-success-bg" : "border-border bg-surface-secondary hover:bg-surface-subtle")
            }
          >
            <ChevronDown className={"h-3.5 w-3.5 shrink-0 transition-transform " + (isBoardActive ? "text-success " : "text-text-muted ") + (open ? "rotate-180" : "")} aria-hidden="true" />
          </button>
        </div>

        {open && (
          <div role="listbox" aria-label="Available workspaces" className="absolute left-0 top-full z-40 mt-2 w-72 border border-border bg-surface shadow-lg">
            <div className="border-b border-border bg-surface-secondary px-2.5 py-2">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Switch Workspace</div>
              <label className="flex h-8 items-center gap-2 border border-border bg-surface px-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search workspaces..."
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-[11px] text-text-primary outline-none placeholder:text-text-muted"
                  aria-label="Search workspaces"
                />
              </label>
            </div>

            {filteredSummaries.length > 0 ? (
              <div className="max-h-60 overflow-y-auto py-1.5">
                {filteredSummaries.map((s) => (
                  <WorkspaceItem key={s.id} summary={s} isSelected={s.id === selectedWorkspaceId} onSelect={handleSelect} />
                ))}
              </div>
            ) : (
              <p className="px-3 py-3 text-xs text-text-muted">No workspaces found.</p>
            )}

            <div className="border-t border-border p-1.5 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSearch("");
                  setShowCreate(true);
                }}
                data-create-workspace-trigger
                className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-text-primary transition-colors hover:bg-surface-subtle"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Create Workspace
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSearch("");
                  setShowImport(true);
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] text-text-secondary transition-colors hover:bg-surface-subtle"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Import Workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onSuccess={handleImportSuccess} />}
      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
          }}
        />
      )}
    </>
  );
}
