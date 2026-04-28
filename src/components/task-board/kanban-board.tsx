"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { TaskStatus, ActorType } from "@/types/task";
import { KanbanColumn } from "./kanban-column";
import type { TaskCardData } from "./task-card";

const COLUMN_ORDER: TaskStatus[] = [
  "todo",
  "ready",
  "in_progress",
  "in_review",
  "blocked",
  "done",
  "cancelled",
];

type ActorFilter = "all" | ActorType;

interface FeatureOption {
  id: string;
  title: string;
}

interface KanbanBoardProps {
  tasks: TaskCardData[];
  features: FeatureOption[];
  repos: string[];
}

export function KanbanBoard({ tasks, features, repos }: KanbanBoardProps) {
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
    () => new Set(features.map((f) => f.id)),
  );
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(
    () => new Set(repos),
  );
  const [actorFilter, setActorFilter] = useState<ActorFilter>("all");
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [reposOpen, setReposOpen] = useState(false);

  const featuresRef = useRef<HTMLDivElement>(null);
  const reposRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (featuresRef.current && !featuresRef.current.contains(e.target as Node)) {
        setFeaturesOpen(false);
      }
      if (reposRef.current && !reposRef.current.contains(e.target as Node)) {
        setReposOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggleFeature = useCallback((id: string) => {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleRepo = useCallback((id: string) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredTasks = tasks.filter((t) => {
    if (!selectedFeatures.has(t.featureId)) return false;
    if (!selectedRepos.has(t.repo)) return false;
    if (actorFilter !== "all" && t.actorType !== actorFilter && t.actorType !== "either") return false;
    return true;
  });

  const tasksByStatus = Object.fromEntries(
    COLUMN_ORDER.map((s) => [s, filteredTasks.filter((t) => t.status === s)]),
  ) as Record<TaskStatus, TaskCardData[]>;

  const featureSelectedCount = selectedFeatures.size;
  const repoSelectedCount = selectedRepos.size;

  return (
    <div className="flex flex-col gap-4 overflow-hidden">
      {/* Filter row */}
      <div className="flex items-center gap-3 px-6">
        {/* Features dropdown */}
        <div className="relative" ref={featuresRef}>
          <button
            onClick={() => {
              setFeaturesOpen((o) => !o);
              setReposOpen(false);
            }}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary shadow-sm hover:border-primary/40 focus:outline-none"
          >
            <span>
              Features ({featureSelectedCount}/{features.length})
            </span>
            <ChevronDown size={14} className="text-text-muted" aria-hidden="true" />
          </button>
          {featuresOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-border bg-surface py-1 shadow-lg">
              {features.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFeature(f.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-bg"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selectedFeatures.has(f.id)
                        ? "border-primary bg-primary"
                        : "border-border bg-surface"
                    }`}
                  >
                    {selectedFeatures.has(f.id) && (
                      <Check size={10} className="text-white" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-xs text-text-primary">{f.title}</span>
                    <span className="font-mono truncate text-[10px] text-text-muted">{f.id}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Repos dropdown */}
        <div className="relative" ref={reposRef}>
          <button
            onClick={() => {
              setReposOpen((o) => !o);
              setFeaturesOpen(false);
            }}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary shadow-sm hover:border-primary/40 focus:outline-none"
          >
            <span>
              Repos ({repoSelectedCount}/{repos.length})
            </span>
            <ChevronDown size={14} className="text-text-muted" aria-hidden="true" />
          </button>
          {reposOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-border bg-surface py-1 shadow-lg">
              {repos.map((repo) => (
                <button
                  key={repo}
                  onClick={() => toggleRepo(repo)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-bg"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selectedRepos.has(repo)
                        ? "border-primary bg-primary"
                        : "border-border bg-surface"
                    }`}
                  >
                    {selectedRepos.has(repo) && (
                      <Check size={10} className="text-white" />
                    )}
                  </span>
                  <span className="font-mono text-xs text-text-primary">{repo}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actor segmented toggle */}
        <div className="flex h-9 items-center rounded-lg border border-border bg-surface p-0.5">
          {(["all", "agent", "human"] as ActorFilter[]).map((a) => (
            <button
              key={a}
              onClick={() => setActorFilter(a)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                actorFilter === a
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban columns (horizontal scroll) */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 px-6" style={{ minWidth: "max-content" }}>
          {COLUMN_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
