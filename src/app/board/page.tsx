"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getWorkspace } from "@/services/workspace-store";
import type { StoredWorkspace } from "@/types/workspace";
import { BoardHeader } from "@/features/board/components/BoardHeader";
import {
  getStoredPanelSelection,
  savePanelSelection,
} from "@/features/board/lib/panel-selection-store";

import {
  BoardProvider,
  KanbanBoard,
} from "@/features/board/components/KanbanBoard";
import {
  TaskTrackingDetailPanel,
  TaskTrackingPanel,
  type PanelSelection,
} from "@/features/board/components/TaskTrackingPanel";

export default function BoardPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<StoredWorkspace | null>(null);
  const [resolved, setResolved] = useState(false);
  const [selectedPanel, setSelectedPanel] =
    useState<PanelSelection>("kanban_board");

  useEffect(() => {
    const stored = getWorkspace();
    if (!stored) {
      router.replace("/connect");
      return;
    }
    setSelectedPanel(getStoredPanelSelection() ?? "kanban_board");
    setWorkspace(stored);
    setResolved(true);
  }, [router]);

  const handleSelectPanel = useCallback((panel: PanelSelection) => {
    setSelectedPanel(panel);
    savePanelSelection(panel);
  }, []);

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
        <div className="flex flex-1 overflow-hidden">
          <TaskTrackingPanel
            selectedPanel={selectedPanel}
            onSelectPanel={handleSelectPanel}
          />
          {selectedPanel === "kanban_board" ? (
            <section className="min-w-0 flex-1 overflow-hidden p-6">
              <KanbanBoard />
            </section>
          ) : (
            <TaskTrackingDetailPanel selectedPanel={selectedPanel} />
          )}
        </div>
      </BoardProvider>
    </main>
  );
}
