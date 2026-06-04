import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("React performance boundaries", () => {
  it("keeps task and feature routes on split session entry points", () => {
    const taskRoute = readSource("src/app/task/[sessionId]/page.tsx");
    const featureRoute = readSource("src/app/feature/[sessionId]/page.tsx");

    expect(taskRoute).toContain("WorkspaceSessionPage/TaskSessionPage");
    expect(taskRoute).not.toContain(
      'components/WorkspaceSessionPage"',
    );

    expect(featureRoute).toContain("WorkspaceSessionPage/FeatureSessionPage");
    expect(featureRoute).not.toContain(
      'components/WorkspaceSessionPage"',
    );
  });

  it("does not let task sessions import feature or markdown modules", () => {
    const taskSession = readSource(
      "src/features/workspaces/components/WorkspaceSessionPage/TaskSessionPage.tsx",
    );
    const featureSession = readSource(
      "src/features/workspaces/components/WorkspaceSessionPage/FeatureSessionPage.tsx",
    );

    expect(taskSession).toContain("TaskTabView");
    expect(taskSession).toContain(
      "@/features/tasks/components/TaskTabView/TaskTabView",
    );
    expect(taskSession).not.toContain('from "@/features/tasks"');
    expect(taskSession).not.toMatch(/FeatureTabView|MarkdownContent/);
    expect(featureSession).toContain("FeatureTabView");
    expect(featureSession).toContain(
      "@/features/board/components/FeatureTabView/FeatureTabView",
    );
    expect(featureSession).not.toContain("TaskTabView");
  });

  it("keeps board route imports on direct component modules", () => {
    const boardRoute = readSource("src/app/board/page.tsx");

    // T1: detail modal mounts should no longer be imported on the board route
    expect(boardRoute).toContain(
      "@/features/board/components/KanbanBoard/KanbanBoard.context",
    );
    expect(boardRoute).not.toContain('from "@/features/tasks"');
    expect(boardRoute).not.toContain(
      'from "@/features/board/components/KanbanBoard"',
    );
  });

  it("lets the board provider own active task polling", () => {
    const sidebarTasksHook = readSource(
      "src/features/board/hooks/useSidebarTasks.ts",
    );

    expect(sidebarTasksHook).not.toContain("setInterval(");
  });

  it("lazy-loads markdown rendering from feature tabs", () => {
    const featureTabView = readSource(
      "src/features/board/components/FeatureTabView/FeatureTabView.tsx",
    );
    const markdownBlock = readSource(
      "src/features/board/components/FeatureTabView/MarkdownBlock.tsx",
    );

    // FeatureTabView must not directly import MarkdownContent (eager load)
    expect(featureTabView).not.toContain(
      'import { MarkdownContent } from "@/lib/markdown"',
    );
    // The lazy load lives in the shared MarkdownBlock module
    expect(markdownBlock).toContain("lazy(");
    expect(markdownBlock).toContain("Suspense");
  });

  it("uses a narrow context for the tracking sidebar", () => {
    const boardContext = readSource(
      "src/features/board/components/KanbanBoard/KanbanBoard.context.tsx",
    );
    const trackingPanel = readSource(
      "src/features/board/components/TaskTrackingPanel/TaskTrackingPanel.tsx",
    );

    expect(boardContext).toContain("BoardTrackingContext");
    expect(trackingPanel).toContain("useBoardTrackingContext");
  });

  it("subscribes the board provider to workspace actions, not the full workspace context", () => {
    const boardContext = readSource(
      "src/features/board/components/KanbanBoard/KanbanBoard.context.tsx",
    );
    const workspaceContext = readSource(
      "src/features/workspaces/context/WorkspaceContext.tsx",
    );

    expect(boardContext).toContain("useWorkspaceActionsContext");
    expect(boardContext).not.toContain("useWorkspaceContext");
    expect(workspaceContext).toContain("WorkspaceActionsContext");
    expect(workspaceContext).toContain("openTaskTabsRef.current.find");
    expect(workspaceContext).toContain("openFeatureTabsRef.current.find");
  });

  it("queries task board search by title while preserving selected statuses", () => {
    const boardContext = readSource(
      "src/features/board/components/KanbanBoard/KanbanBoard.context.tsx",
    );

    expect(boardContext).toContain("title: trimmedTaskQuery");
    expect(boardContext).not.toContain("task_id: trimmedTaskQuery");
    expect(boardContext).toContain("taskActiveFilters.statuses.join(\",\")");
  });

  it("hoists static board status lookups instead of rebuilding them on render", () => {
    const taskBoardView = readSource(
      "src/features/board/components/TaskBoardView/TaskBoardView.tsx",
    );
    const featureBoardView = readSource(
      "src/features/board/components/FeatureBoardView/FeatureBoardView.tsx",
    );

    expect(taskBoardView).toContain("const STATUS_COLUMN_MAP = new Map");
    expect(taskBoardView).not.toContain("useMemo(\n    () => new Map");
    expect(featureBoardView).toContain("const FEATURE_STATUS_COLUMNS");
    expect(featureBoardView).not.toContain(
      "useMemo(() => getFeatureStatusColumns(), [])",
    );
  });

  it("uses constant-time status placement in feature rows", () => {
    const featureRow = readSource(
      "src/features/board/components/FeatureRow/FeatureRow.tsx",
    );

    expect(featureRow).toContain("const TASK_STATUS_SET = new Set");
    expect(featureRow).not.toContain("STATUS_COLUMNS.find(");
    expect(featureRow).not.toContain(".includes(task.status)");
  });
});
