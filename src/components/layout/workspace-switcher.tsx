"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { useWorkspace } from "@/context/workspace-context";

interface WorkspaceSwitcherProps {
  workspaceIds: string[];
}

export function WorkspaceSwitcher({ workspaceIds }: WorkspaceSwitcherProps) {
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-bg"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="max-w-[180px] truncate">
          {activeWorkspaceId ?? "Select workspace"}
        </span>
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          {workspaceIds.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">
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
                      router.push(`/?workspace=${encodeURIComponent(id)}`);
                    }}
                    className={[
                      "flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors",
                      id === activeWorkspaceId
                        ? "bg-primary-light text-primary font-medium"
                        : "text-text-primary hover:bg-bg",
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
                      <Check size={14} aria-hidden="true" className="shrink-0" />
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
