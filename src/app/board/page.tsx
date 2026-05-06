"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getWorkspace } from "@/services/workspace-store";
import type { StoredWorkspace } from "@/types/workspace";
import { BoardHeader } from "@/features/board/components/BoardHeader";

import { BoardProvider, useBoardContext, KanbanBoard} from "@/features/board/components/KanbanBoard";
import { TaskTrackingPanel } from "@/features/board/components/TaskTrackingPanel";

function BoardStatus() {
  const { loading, error, features } = useBoardContext();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-muted">Loading board…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-danger">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-text-muted">
        {features.length} feature{features.length === 1 ? "" : "s"} loaded.
      </p>
    </div>
  );
}

export default function BoardPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<StoredWorkspace | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const stored = getWorkspace();
    if (!stored) {
      router.replace("/connect");
      return;
    }
    setWorkspace(stored);
    setResolved(true);
  }, [router]);

  if (!resolved || !workspace) {
    return (
      <main className="flex min-h-screen flex-col bg-bg">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-muted">Resolving workspace…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-bg">
      <BoardProvider workspace={workspace}>
        <BoardHeader />
        <KanbanBoard />
        <div className="flex flex-1 overflow-hidden">
          <TaskTrackingPanel />
          <BoardStatus />
        </div>
      </BoardProvider>
    </main>
  );
}
