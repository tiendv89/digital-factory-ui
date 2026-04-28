"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";

interface WorkspaceSwitcherProps {
  workspaceIds: string[];
}

export function WorkspaceSwitcher({ workspaceIds }: WorkspaceSwitcherProps) {
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm text-(--color-text-primary) transition-colors hover:bg-(--color-bg)"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="max-w-[180px] truncate">
          {activeWorkspaceId ?? "Select workspace"}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="#5a6380"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg"
        >
          {workspaceIds.length === 0 ? (
            <p className="px-4 py-3 text-sm text-(--color-text-muted)">
              No workspaces found
            </p>
          ) : (
            <ul className="py-1">
              {workspaceIds.map((id) => (
                <li key={id}>
                  <button
                    role="option"
                    aria-selected={id === activeWorkspaceId}
                    onClick={() => {
                      setActiveWorkspaceId(id);
                      setOpen(false);
                    }}
                    className={[
                      "flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors",
                      id === activeWorkspaceId
                        ? "bg-(--color-primary-light) text-(--color-primary) font-medium"
                        : "text-(--color-text-primary) hover:bg-(--color-bg)",
                    ].join(" ")}
                    style={
                      id === activeWorkspaceId
                        ? { backgroundColor: "rgba(84,101,232,0.08)" }
                        : undefined
                    }
                  >
                    <span className="min-w-0 flex-1 truncate text-left">
                      {id}
                    </span>
                    {id === activeWorkspaceId && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                        className="shrink-0"
                      >
                        <path
                          d="M2 7l4 4 6-6"
                          stroke="#5465e8"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
