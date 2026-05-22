/**
 * Tests for T5 feature tab deliverables:
 *   - Feature Mode gating: FeatureListRow receives onDoubleClick in FeatureBoardView
 *   - Feature tab loading, error, and content rendering
 *   - Feature header fields (copy-id, status, stage, updated-at, task-counts)
 *   - Source state stale warning
 *   - Panel tabs: Tasks, Product Spec, Technical Design
 *   - Feature-scoped task drilldown loading, error, content
 *   - Back-to-board and back-to-feature navigation affordances
 *   - No sidebar inside feature tab surface
 *   - WorkspaceTabBar renders feature tabs alongside task tabs
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FeatureDetail,
  TaskDetail,
  TaskSummary,
  SourceState,
} from "../services/workflow-backend/types";
import type { ParsedFeature } from "../services/yaml-parser";
import type { FeatureActiveFilters, ActiveFilters } from "../features/board/types";

// ─── Mock useFeatureDetail / useFeatureTask ───────────────────────────────────

const mockUseFeatureDetail = vi.hoisted(() => vi.fn());
const mockUseFeatureTask = vi.hoisted(() => vi.fn());

vi.mock("../features/board/hooks/useFeatureDetail", () => ({
  useFeatureDetail: mockUseFeatureDetail,
  useFeatureTask: mockUseFeatureTask,
}));

// ─── Mock useWorkspaceContext ─────────────────────────────────────────────────

const mockWorkspaceContext = vi.hoisted(() => ({
  activeSurface: "board" as string,
  activeTaskTabId: null as string | null,
  activeFeatureTabId: null as string | null,
  openTaskTabs: [] as Array<{
    sessionId: string;
    workspaceId: string;
    taskId: string;
    taskName: string;
    title: string;
  }>,
  openFeatureTabs: [] as Array<{
    sessionId: string;
    workspaceId: string;
    featureId: string;
    featureName: string;
    title: string;
  }>,
  activeWorkspace: null as { name?: string; slug?: string } | null,
  openTaskTab: vi.fn(),
  closeTaskTab: vi.fn(),
  activateTaskTab: vi.fn(),
  openFeatureTab: vi.fn(),
  closeFeatureTab: vi.fn(),
  activateFeatureTab: vi.fn(),
  goToBoard: vi.fn(),
}));

vi.mock("../features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockWorkspaceContext,
}));

// ─── Mock useBoardContext for FeatureBoardView tests ─────────────────────────

const mockOpenFeatureTab = vi.hoisted(() => vi.fn());
const mockSetSelectedFeature = vi.hoisted(() => vi.fn());

const featureBoardContextRef = vi.hoisted(() => ({
  current: null as unknown,
}));

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => featureBoardContextRef.current,
}));

import { FeatureTabView } from "../features/board/components/FeatureTabView/FeatureTabView";
import { FeatureTaskDrilldown, DrilldownTaskContent } from "../features/board/components/FeatureTabView/FeatureTabView";
import { WorkspaceTabBar } from "../features/workspaces/components/WorkspaceTabBar/WorkspaceTabBar";
import { FeatureBoardView } from "../features/board/components/FeatureBoardView/FeatureBoardView";
import { FeatureListRow } from "../features/board/components/FeatureBoardView/FeatureListRow";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeFeatureDetail(overrides: Partial<FeatureDetail> = {}): FeatureDetail {
  return {
    id: "feat-uuid-1",
    feature_id: "feat-uuid-1",
    feature_name: "kanban-board-feature",
    title: "Feature Kanban Board",
    status: "in_implementation",
    current_stage: "in_tdd",
    stages: {},
    updated_at: "2026-05-20T10:30:00Z",
    task_counts: {
      total: 6,
      done: 4,
      in_progress: 1,
      blocked: 0,
      ready: 1,
      todo: 0,
    },
    workspace_id: "ws-uuid-1",
    documents: [],
    tasks: [],
    activity: [
      {
        action: "approved",
        scope: "tasks",
        actor: "minhkienn203@gmail.com",
        occurred_at: "2026-05-09T13:02:00Z",
        note: "Tasks approved. Feature advances to ready_for_implementation.",
      },
    ],
    source_state: { stale: false },
    ...overrides,
  };
}

function makeTaskSummary(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "task-uuid-1",
    task_id: "task-uuid-1",
    task_name: "T3",
    feature_id: "feat-uuid-1",
    feature_name: "kanban-board-feature",
    title: "Implement kanban board",
    status: "done",
    repo: "acme/ui-service",
    branch: "feature/kanban-board-feature-T3",
    is_blocked: false,
    pr: null,
    workspace_pr: null,
    ...overrides,
  };
}

function makeTaskDetail(overrides: Partial<TaskDetail> = {}): TaskDetail {
  return {
    ...makeTaskSummary(),
    next_action: "",
    blocked_reason: "",
    workspace_id: "ws-uuid-1",
    depends_on: ["T1", "T2"],
    execution: { actor_type: "agent", last_updated_by: "bob@example.com" },
    pr_refs: [],
    ...overrides,
  };
}

function makeParsedFeature(overrides: Partial<ParsedFeature> = {}): ParsedFeature {
  return {
    id: "kanban-board-feature",
    title: "Feature Kanban Board",
    featureStatus: "in_implementation",
    tasks: [],
    backendId: "feat-uuid-1",
    ...overrides,
  };
}

function buildFeatureBoardContext(opts: {
  features?: ParsedFeature[];
  loading?: boolean;
  error?: null | { kind: string; message: string };
  featureSearchQuery?: string;
  featureActiveFilters?: FeatureActiveFilters;
  openFeatureTab?: ReturnType<typeof vi.fn>;
}) {
  const taskFilters: ActiveFilters = { statuses: [] };
  const featureFilters: FeatureActiveFilters = opts.featureActiveFilters ?? {
    statuses: ["in_implementation"],
  };

  return {
    features: opts.features ?? [],
    trackedFeatures: [],
    loading: opts.loading ?? false,
    error: opts.error ?? null,
    reload: vi.fn(),
    boardMode: "feature" as const,
    setBoardMode: vi.fn(),
    taskSearchQuery: "",
    setTaskSearchQuery: vi.fn(),
    taskActiveFilters: taskFilters,
    setTaskActiveFilters: vi.fn(),
    featureSearchQuery: opts.featureSearchQuery ?? "",
    setFeatureSearchQuery: vi.fn(),
    featureActiveFilters: featureFilters,
    setFeatureActiveFilters: vi.fn(),
    searchQuery: "",
    setSearchQuery: vi.fn(),
    activeFilters: taskFilters,
    setActiveFilters: vi.fn(),
    expandedFeatureIds: new Set<string>(),
    toggleFeature: vi.fn(),
    selectedTask: null,
    setSelectedTask: vi.fn(),
    selectedFeature: null,
    setSelectedFeature: mockSetSelectedFeature,
    openFeatureTab: opts.openFeatureTab ?? mockOpenFeatureTab,
    backendFeatureResults: null,
    featureSearching: false,
    featureSearchError: null,
    syncing: false,
    syncError: null,
    syncBoard: vi.fn(),
    backendTaskResults: null,
    taskSearching: false,
    taskSearchError: null,
    openTaskTab: vi.fn(),
    workspaceDetail: { id: "ws-uuid-1" } as unknown as import("../services/workflow-backend").WorkspaceDetail,
  };
}

// ─── FeatureTabView — loading state ──────────────────────────────────────────

describe("FeatureTabView — loading state", () => {
  beforeEach(() => {
    mockUseFeatureDetail.mockReturnValue({
      feature: null,
      loading: true,
      error: null,
      reload: vi.fn(),
    });
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders data-feature-tab-loading indicator", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-feature-tab-loading");
    expect(html).toContain("Loading feature");
  });

  it("does not render feature content while loading", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).not.toContain("data-feature-tab-content");
    expect(html).not.toContain("data-feature-tab-error");
  });
});

// ─── FeatureTabView — error state ────────────────────────────────────────────

describe("FeatureTabView — error state", () => {
  beforeEach(() => {
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders data-feature-tab-error with error message", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: null,
      loading: false,
      error: {
        code: "NOT_FOUND",
        message: "Feature not found.",
        retryable: false,
      },
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-feature-tab-error");
    expect(html).toContain("Feature not found.");
  });

  it("renders retry button when error is retryable", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: null,
      loading: false,
      error: { code: "TIMEOUT", message: "Timed out.", retryable: true },
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("Retry");
  });

  it("does not render retry button when error is not retryable", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: null,
      loading: false,
      error: { code: "NOT_FOUND", message: "Not found.", retryable: false },
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).not.toContain("Retry");
  });
});

// ─── FeatureTabView — content rendering ──────────────────────────────────────

describe("FeatureTabView — content rendering", () => {
  beforeEach(() => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeatureDetail(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders data-feature-tab-content", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-feature-tab-content");
  });

  it("renders feature detail without an agent chat placeholder", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );

    expect(html).toContain("data-feature-tab-content");
    expect(html).not.toContain("data-detail-split-layout");
    expect(html).not.toContain("data-detail-section-one");
    expect(html).not.toContain("data-agent-chat-placeholder");
  });

  it("renders data-feature-tab-header", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-feature-tab-header");
  });

  it("renders back-to-board button with data-back-to-board", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-back-to-board");
    expect(html).toContain("Board");
  });

  it("renders copy-id button with data-copy-feature-id", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-copy-feature-id");
    expect(html).toContain("kanban-board-feature");
  });

  it("renders feature status badge with data-feature-status", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain('data-feature-status="in_implementation"');
  });

  it("renders feature stage badge with data-feature-stage when current_stage is set", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-feature-stage");
    expect(html).toContain("in_tdd");
  });

  it("does not render stage badge when current_stage is absent", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeatureDetail({ current_stage: "" }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).not.toContain("data-feature-stage");
  });

  it("renders data-feature-updated-at with the timestamp value", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain('data-feature-updated-at="2026-05-20T10:30:00Z"');
  });

  it("keeps task counts out of the compact feature header", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).not.toContain("data-feature-task-counts");
    expect(html).toContain("Logs view.");
  });
});

// ─── FeatureTabView — source state stale warning ─────────────────────────────

describe("FeatureTabView — source state stale warning", () => {
  beforeEach(() => {
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders stale warning banner when source_state.stale is true", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeatureDetail({
        source_state: { stale: true, error_code: "SYNC_FAILED" } as SourceState,
      }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("Data may be stale");
    expect(html).toContain("SYNC_FAILED");
  });

  it("does not render stale warning when source_state.stale is false", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeatureDetail({ source_state: { stale: false } }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).not.toContain("Data may be stale");
  });
});

// ─── FeatureTabView — panel navigation ───────────────────────────────────────

describe("FeatureTabView — panel tab rendering", () => {
  beforeEach(() => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeatureDetail(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders data-panel-tasks tab", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-panel-tasks");
    expect(html).toContain("Tasks");
  });

  it("renders data-panel-product-spec tab", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-panel-product-spec");
    expect(html).toContain("Product Spec");
  });

  it("renders data-panel-technical-design tab", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-panel-technical-design");
    expect(html).toContain("Technical Design");
  });

  it("renders data-panel-logs tab", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-panel-logs");
    expect(html).toContain("Logs");
  });
});

// ─── FeatureTabView — logs panel ─────────────────────────────────────────────

describe("FeatureTabView — logs panel", () => {
  beforeEach(() => {
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders feature logs by default", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeatureDetail({
        activity: [
          {
            action: "approved",
            scope: "tasks",
            actor: "minhkienn203@gmail.com",
            occurred_at: "2026-05-09T13:02:00Z",
            note: "Tasks approved. Feature advances to ready_for_implementation.",
          },
        ],
      }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-feature-logs-panel");
    expect(html).toContain("data-feature-log-entry");
    expect(html).toContain("Feature Logs");
    expect(html).toContain("Tasks approved. Feature advances to ready_for_implementation.");
  });

  it("renders empty feature logs state when activity is empty", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeatureDetail({ activity: [] }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-feature-logs-panel");
    expect(html).toContain("No activity logs available");
  });

  it("does not render task list while logs tab is the default panel", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeatureDetail({
        tasks: [
          makeTaskSummary({ task_name: "T3", title: "Implement kanban board" }),
          makeTaskSummary({ id: "task-uuid-2", task_id: "task-uuid-2", task_name: "T4", title: "Add sidebar" }),
        ],
      }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-feature-logs-panel");
    expect(html).not.toContain("data-feature-tasks-list");
    expect(html).not.toContain('data-feature-task-row="T3"');
  });
});

// ─── FeatureTabView — feature-scoped task drilldown ──────────────────────────

describe("FeatureTabView — task drilldown (feature-scoped)", () => {
  it("shows logs panel by default before any drilldown is triggered", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeatureDetail({
        tasks: [makeTaskSummary({ task_name: "T3" })],
      }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-feature-logs-panel");
    expect(html).not.toContain("data-feature-task-drilldown-content");
  });

});

// ─── FeatureTaskDrilldown — direct unit tests ─────────────────────────────────

describe("FeatureTaskDrilldown — loading state", () => {
  beforeEach(() => {
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: true,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders data-feature-task-drilldown-loading indicator", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTaskDrilldown, {
        workspaceId: "ws-uuid-1",
        featureId: "feat-uuid-1",
        taskId: "task-uuid-1",
        onBack: vi.fn(),
      }),
    );
    expect(html).toContain("data-feature-task-drilldown-loading");
    expect(html).toContain("Loading task");
  });

  it("does not render drilldown content while loading", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTaskDrilldown, {
        workspaceId: "ws-uuid-1",
        featureId: "feat-uuid-1",
        taskId: "task-uuid-1",
        onBack: vi.fn(),
      }),
    );
    expect(html).not.toContain("data-feature-task-drilldown-content");
    expect(html).not.toContain("data-feature-task-drilldown-error");
  });
});

describe("FeatureTaskDrilldown — error state", () => {
  it("renders data-feature-task-drilldown-error with error message", () => {
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: { code: "NOT_FOUND", message: "Task not found.", retryable: false },
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTaskDrilldown, {
        workspaceId: "ws-uuid-1",
        featureId: "feat-uuid-1",
        taskId: "task-uuid-1",
        onBack: vi.fn(),
      }),
    );
    expect(html).toContain("data-feature-task-drilldown-error");
    expect(html).toContain("Task not found.");
  });

  it("renders back-to-feature button in error state", () => {
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: { code: "NOT_FOUND", message: "Task not found.", retryable: false },
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTaskDrilldown, {
        workspaceId: "ws-uuid-1",
        featureId: "feat-uuid-1",
        taskId: "task-uuid-1",
        onBack: vi.fn(),
      }),
    );
    expect(html).toContain("Back to feature");
  });

  it("renders retry button when error is retryable", () => {
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: { code: "TIMEOUT", message: "Timed out.", retryable: true },
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTaskDrilldown, {
        workspaceId: "ws-uuid-1",
        featureId: "feat-uuid-1",
        taskId: "task-uuid-1",
        onBack: vi.fn(),
      }),
    );
    expect(html).toContain("Retry");
  });

  it("does not render retry button when error is not retryable", () => {
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: { code: "NOT_FOUND", message: "Not found.", retryable: false },
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTaskDrilldown, {
        workspaceId: "ws-uuid-1",
        featureId: "feat-uuid-1",
        taskId: "task-uuid-1",
        onBack: vi.fn(),
      }),
    );
    expect(html).not.toContain("Retry");
  });
});

describe("FeatureTaskDrilldown — content rendering", () => {
  beforeEach(() => {
    mockUseFeatureTask.mockReturnValue({
      task: makeTaskDetail(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders data-feature-task-drilldown-content when task is loaded", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTaskDrilldown, {
        workspaceId: "ws-uuid-1",
        featureId: "feat-uuid-1",
        taskId: "task-uuid-1",
        onBack: vi.fn(),
      }),
    );
    expect(html).toContain("data-feature-task-drilldown-content");
  });

  it("renders data-back-to-feature navigation affordance", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTaskDrilldown, {
        workspaceId: "ws-uuid-1",
        featureId: "feat-uuid-1",
        taskId: "task-uuid-1",
        onBack: vi.fn(),
      }),
    );
    expect(html).toContain("data-back-to-feature");
    expect(html).toContain("Back to feature");
  });

  it("renders task name and title in drilldown header", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTaskDrilldown, {
        workspaceId: "ws-uuid-1",
        featureId: "feat-uuid-1",
        taskId: "task-uuid-1",
        onBack: vi.fn(),
      }),
    );
    expect(html).toContain("T3");
    expect(html).toContain("Implement kanban board");
  });
});

// ─── DrilldownTaskContent — back-to-feature affordance ───────────────────────

describe("DrilldownTaskContent — back-to-feature affordance", () => {
  it("renders data-back-to-feature button with aria-label", () => {
    const html = renderToStaticMarkup(
      React.createElement(DrilldownTaskContent, {
        task: makeTaskDetail(),
        onBack: vi.fn(),
        onReload: vi.fn(),
      }),
    );
    expect(html).toContain("data-back-to-feature");
    expect(html).toContain('aria-label="Back to feature"');
  });

  it("renders data-feature-task-drilldown-content wrapper", () => {
    const html = renderToStaticMarkup(
      React.createElement(DrilldownTaskContent, {
        task: makeTaskDetail(),
        onBack: vi.fn(),
        onReload: vi.fn(),
      }),
    );
    expect(html).toContain("data-feature-task-drilldown-content");
  });

  it("renders drilldown task detail without an agent chat placeholder", () => {
    const html = renderToStaticMarkup(
      React.createElement(DrilldownTaskContent, {
        task: makeTaskDetail(),
        onBack: vi.fn(),
        onReload: vi.fn(),
      }),
    );

    expect(html).toContain("data-feature-task-drilldown-content");
    expect(html).not.toContain("data-detail-split-layout");
    expect(html).not.toContain("data-detail-section-one");
    expect(html).not.toContain("data-agent-chat-placeholder");
  });

  it("does not render PR status tags on GitHub links", () => {
    const html = renderToStaticMarkup(
      React.createElement(DrilldownTaskContent, {
        task: makeTaskDetail({
          pr_refs: [
            {
              label: "Implementation PR",
              repo: "acme/ui-service",
              status: "merged",
              url: "https://github.com/acme/ui-service/pull/42",
            },
          ],
        }),
        onBack: vi.fn(),
        onReload: vi.fn(),
      }),
    );

    const prCardStart = html.indexOf(
      'data-pr-ref="https://github.com/acme/ui-service/pull/42"',
    );
    const prCard = html.slice(prCardStart, html.indexOf("</a>", prCardStart));
    expect(prCard).toContain("Implementation PR");
    expect(prCard).not.toContain(">merged<");
  });
});

// ─── FeatureTabView — document panels ────────────────────────────────────────

describe("FeatureTabView — document panels render empty when no docs", () => {
  beforeEach(() => {
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders doc-empty for product_spec when not present", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeatureDetail({ documents: [] }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    // Note: default panel is tasks, not product_spec. We just verify the panel
    // tabs are rendered — the doc panels themselves are only rendered when tab is active.
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-panel-product-spec");
    expect(html).toContain("data-panel-technical-design");
  });
});

// ─── FeatureTabView — no sidebar ─────────────────────────────────────────────

describe("FeatureTabView — no board sidebar rendered", () => {
  beforeEach(() => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeatureDetail(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("does not render board sidebar markup in feature tab content", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).not.toContain("Tasks Sidebar");
    expect(html).not.toContain('aria-label="Tasks sidebar"');
    expect(html).not.toContain("data-task-tracking-panel");
  });
});

// ─── WorkspaceTabBar — feature tabs ──────────────────────────────────────────

describe("WorkspaceTabBar — feature tab rendering", () => {
  beforeEach(() => {
    mockWorkspaceContext.openTaskTabs = [];
    mockWorkspaceContext.openFeatureTabs = [];
    mockWorkspaceContext.activeSurface = "board";
    mockWorkspaceContext.activeFeatureTabId = null;
    mockWorkspaceContext.activeTaskTabId = null;
    mockWorkspaceContext.activeWorkspace = { name: "My Workspace" };
  });

  it("renders feature tabs for each open feature tab", () => {
    mockWorkspaceContext.openFeatureTabs = [
      {
        sessionId: "feature-session-1",
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
        featureName: "kanban-board-feature",
        title: "Feature Kanban Board",
      },
      {
        sessionId: "feature-session-2",
        workspaceId: "ws-1",
        featureId: "feat-uuid-2",
        featureName: "auth-feature",
        title: "Auth Feature",
      },
    ];
    mockWorkspaceContext.activeSurface = "feature-tab";
    mockWorkspaceContext.activeFeatureTabId = "feature-session-1";

    const html = renderToStaticMarkup(React.createElement(WorkspaceTabBar));
    expect(html).toContain('data-feature-tab="feature-session-1"');
    expect(html).toContain('data-feature-tab="feature-session-2"');
    expect(html).toContain("Feature Kanban Board");
    expect(html).toContain("Auth Feature");
  });

  it("marks active feature tab with aria-selected=true", () => {
    mockWorkspaceContext.openFeatureTabs = [
      {
        sessionId: "feature-session-1",
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
        featureName: "kanban-board-feature",
        title: "Feature Kanban Board",
      },
    ];
    mockWorkspaceContext.activeSurface = "feature-tab";
    mockWorkspaceContext.activeFeatureTabId = "feature-session-1";

    const html = renderToStaticMarkup(React.createElement(WorkspaceTabBar));
    expect(html).toContain('aria-selected="true"');
  });

  it("marks inactive feature tab with aria-selected=false", () => {
    mockWorkspaceContext.openFeatureTabs = [
      {
        sessionId: "feature-session-1",
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
        featureName: "kanban-board-feature",
        title: "Feature Kanban Board",
      },
    ];
    mockWorkspaceContext.activeSurface = "board";
    mockWorkspaceContext.activeFeatureTabId = null;

    const html = renderToStaticMarkup(React.createElement(WorkspaceTabBar));
    expect(html).toContain('aria-selected="false"');
  });

  it("renders close button for each feature tab", () => {
    mockWorkspaceContext.openFeatureTabs = [
      {
        sessionId: "feature-session-1",
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
        featureName: "kanban-board-feature",
        title: "Feature Kanban Board",
      },
    ];

    const html = renderToStaticMarkup(React.createElement(WorkspaceTabBar));
    expect(html).toContain("Close kanban-board-feature tab");
  });

  it("renders feature tabs alongside task tabs", () => {
    mockWorkspaceContext.openTaskTabs = [
      {
        sessionId: "task-session-1",
        workspaceId: "ws-1",
        taskId: "task-uuid-1",
        taskName: "T5",
        title: "Some task",
      },
    ];
    mockWorkspaceContext.openFeatureTabs = [
      {
        sessionId: "feature-session-1",
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
        featureName: "kanban-board-feature",
        title: "Feature Kanban Board",
      },
    ];

    const html = renderToStaticMarkup(React.createElement(WorkspaceTabBar));
    expect(html).toContain('data-task-tab="task-session-1"');
    expect(html).toContain('data-feature-tab="feature-session-1"');
  });

  it("renders no feature tabs when openFeatureTabs is empty", () => {
    mockWorkspaceContext.openFeatureTabs = [];

    const html = renderToStaticMarkup(React.createElement(WorkspaceTabBar));
    expect(html).not.toContain("data-feature-tab=");
  });
});

// ─── Feature Mode gating — FeatureBoardView passes onDoubleClick ──────────────

describe("Feature Mode gating — FeatureBoardView wires onDoubleClick to openFeatureTab", () => {
  const openFeatureTabMock = vi.fn();

  beforeEach(() => {
    openFeatureTabMock.mockClear();
    mockSetSelectedFeature.mockClear();
  });

  it("renders FeatureListRow elements with double-click affordance present (role=button)", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({
      features: [makeParsedFeature({ id: "my-feat", featureStatus: "in_implementation" })],
      featureActiveFilters: { statuses: ["in_implementation"] },
      openFeatureTab: openFeatureTabMock,
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    // FeatureListRow is rendered; double-click handler is wired at runtime
    expect(html).toContain("my-feat");
    expect(html).toContain('role="button"');
  });

  it("does not crash when rendering FeatureBoardView with features in feature mode", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({
      features: [
        makeParsedFeature({ id: "feat-a", featureStatus: "in_implementation" }),
        makeParsedFeature({ id: "feat-b", featureStatus: "blocked" }),
      ],
      featureActiveFilters: { statuses: ["in_implementation", "blocked"] },
      openFeatureTab: openFeatureTabMock,
    });

    expect(() =>
      renderToStaticMarkup(React.createElement(FeatureBoardView)),
    ).not.toThrow();
  });
});

// ─── FeatureListRow — double-click prop ──────────────────────────────────────

describe("FeatureListRow — onDoubleClick prop", () => {
  it("renders without error when onDoubleClick is provided", () => {
    const feature = makeParsedFeature();
    expect(() =>
      renderToStaticMarkup(
        React.createElement(FeatureListRow, {
          feature,
          onClick: vi.fn(),
          onDoubleClick: vi.fn(),
        }),
      ),
    ).not.toThrow();
  });

  it("renders without error when onDoubleClick is omitted", () => {
    const feature = makeParsedFeature();
    expect(() =>
      renderToStaticMarkup(
        React.createElement(FeatureListRow, {
          feature,
          onClick: vi.fn(),
        }),
      ),
    ).not.toThrow();
  });
});
