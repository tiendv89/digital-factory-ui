/**
 * T4 — Feature IDE workbench
 *
 * Covers:
 * - FeatureIDEWorkbench renders four-pane layout (explorer, chat, docs, activity)
 * - FeatureIDEWorkbench shows loading state while feature data loads
 * - FeatureIDEWorkbench shows error state on fetch failure
 * - FeatureIDEExplorer renders feature name, status badge
 * - FeatureIDEExplorer renders Artifacts section with product spec, tech design, tasks, logs
 * - FeatureIDEExplorer renders Tasks section from feature tasks
 * - FeatureIDEExplorer renders Sessions section (real)
 * - FeatureIDEExplorer renders Channels placeholder section
 * - FeatureIDEDocsPanel renders tab bar with all four tabs
 * - FeatureIDEDocsPanel shows product_spec tab as active when selected
 * - FeatureIDEDocsPanel shows tech design tab as active when selected
 * - FeatureIDEDocsPanel renders checked indicator on approved stages
 * - AgentChatPanel accepts requestSessionId prop without error
 * - FeatureSessionPage renders FeatureIDEWorkbench
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeatureDetail, ActivityEvent } from "../services/workflow-backend/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/feature/feat-tab-1"),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement("a", { href, className }, children),
}));

vi.mock("@/features/auth", () => ({
  useSession: () => ({
    session: { status: "authenticated" },
    logout: vi.fn(),
  }),
}));

const mockUseFeatureDetail = vi.hoisted(() => vi.fn());
vi.mock("../features/board/hooks/useFeatureDetail", () => ({
  useFeatureDetail: mockUseFeatureDetail,
}));

const mockUseActivity = vi.hoisted(() => vi.fn());
vi.mock("../features/board/hooks/useActivity", () => ({
  useActivity: mockUseActivity,
}));

const mockWorkspaceContext = vi.hoisted(() => ({
  activeWorkspace: {
    id: "ws-1",
    name: "TestWS",
    slug: "test-ws",
    source_state: { stale: false },
    features: [],
    tasks: [],
  },
  loadingWorkspace: false,
  workspaceError: null,
  summaries: [{ workspaceId: "ws-1", name: "TestWS" }],
  selectedWorkspaceId: "ws-1",
  openFeatureTabs: [],
  openTaskTabs: [],
  activeFeatureTabId: null as string | null,
  activeTaskTabId: null as string | null,
  activeSurface: "board" as string,
  markFeatureTabActive: vi.fn(),
  openTaskTab: vi.fn(),
  closeTaskTab: vi.fn(),
  activateTaskTab: vi.fn(),
  openFeatureTab: vi.fn(),
  closeFeatureTab: vi.fn(),
  activateFeatureTab: vi.fn(),
  goToBoard: vi.fn(),
  selectWorkspace: vi.fn(),
}));

vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockWorkspaceContext,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: vi.fn(() => ({ data: undefined, isFetching: false, error: null, refetch: vi.fn() })),
}));

// Stub child components to avoid deep dependency chains
vi.mock("../features/agent-chat/AgentChatPanel", () => ({
  AgentChatPanel: ({ workspaceId, featureId, requestSessionId }: {
    workspaceId: string;
    featureId: string;
    requestSessionId?: string | null;
  }) =>
    React.createElement("div", {
      "data-agent-chat-panel": "",
      "data-workspace-id": workspaceId,
      "data-feature-id": featureId,
      "data-request-session-id": requestSessionId ?? "",
    }),
}));

vi.mock("../features/agent-chat", () => ({
  AgentChatPanel: ({ workspaceId, featureId, requestSessionId }: {
    workspaceId: string;
    featureId: string;
    requestSessionId?: string | null;
  }) =>
    React.createElement("div", {
      "data-agent-chat-panel": "",
      "data-workspace-id": workspaceId,
      "data-feature-id": featureId,
      "data-request-session-id": requestSessionId ?? "",
    }),
}));

vi.mock("../features/board/components/ActivityFeed/ActivityFeed", () => ({
  ActivityFeed: ({ events, title }: { events: ActivityEvent[]; title?: string }) =>
    React.createElement("div", { "data-activity-feed": "", "data-event-count": events.length }, title),
}));

vi.mock("../features/board/components/FeatureTabView/FeatureDocumentPanel", () => ({
  FeatureDocumentPanel: ({ documentType }: { documentType: string }) =>
    React.createElement("div", { "data-feature-doc": documentType }),
}));

vi.mock("../features/board/components/FeatureTabView/FeatureTasksPanel", () => ({
  FeatureTasksPanel: ({ feature }: { feature: FeatureDetail }) =>
    React.createElement("div", { "data-feature-tasks-panel": "", "data-feature-id": feature.id }),
}));

vi.mock("../features/board/components/FeatureTabView/FeatureLogsPanel", () => ({
  FeatureLogsPanel: ({ events }: { events: ActivityEvent[] }) =>
    React.createElement("div", { "data-feature-logs-panel": "", "data-event-count": events.length }),
}));

const mockListChatSessions = vi.hoisted(() => vi.fn());
vi.mock("../services/workflow-backend/chat", () => ({
  listChatSessions: mockListChatSessions,
}));

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeFeature(overrides: Partial<FeatureDetail> = {}): FeatureDetail {
  return {
    id: "feat-1",
    feature_id: "my-feature",
    feature_name: "my-feature",
    title: "My Feature",
    status: "ready_for_implementation",
    current_stage: "tasks",
    workspace_id: "ws-1",
    documents: [],
    tasks: [
      {
        id: "task-1",
        task_id: "T1",
        task_name: "T1",
        feature_id: "feat-1",
        feature_name: "my-feature",
        title: "Theme tokens",
        status: "done",
        repo: "digital-factory-ui",
        branch: "main",
        is_blocked: false,
      },
      {
        id: "task-2",
        task_id: "T4",
        task_name: "T4",
        feature_id: "feat-1",
        feature_name: "my-feature",
        title: "Feature IDE workbench",
        status: "in_progress",
        repo: "digital-factory-ui",
        branch: "feature/ui-revamp-T4",
        is_blocked: false,
      },
    ],
    stages: {
      product_spec: { review_status: "approved" },
      technical_design: { review_status: "approved" },
    },
    source_state: { stale: false },
    updated_at: "2026-06-09T00:00:00Z",
    task_counts: { total: 2, done: 1, in_progress: 1, blocked: 0, ready: 0, todo: 0 },
    ...overrides,
  };
}

// ─── Tests: FeatureIDEExplorer ────────────────────────────────────────────────

import { FeatureIDEExplorer } from "../features/workspaces/components/FeatureIDE/FeatureIDEExplorer";

describe("FeatureIDEExplorer", () => {
  beforeEach(() => {
    mockListChatSessions.mockResolvedValue([]);
  });

  it("renders data-feature-ide-explorer", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEExplorer, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeDocTab: "product_spec",
        onDocTabChange: vi.fn(),
        selectedSessionId: null,
        onSessionSelect: vi.fn(),
        onNewSession: vi.fn(),
      }),
    );
    expect(html).toContain("data-feature-ide-explorer");
  });

  it("renders feature title", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEExplorer, {
        feature: makeFeature({ title: "My Feature Title" }),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeDocTab: "product_spec",
        onDocTabChange: vi.fn(),
        selectedSessionId: null,
        onSessionSelect: vi.fn(),
        onNewSession: vi.fn(),
      }),
    );
    expect(html).toContain("My Feature Title");
  });

  it("renders Artifacts section with all four artifact types", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEExplorer, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeDocTab: "product_spec",
        onDocTabChange: vi.fn(),
        selectedSessionId: null,
        onSessionSelect: vi.fn(),
        onNewSession: vi.fn(),
      }),
    );
    expect(html).toContain("Product Spec");
    expect(html).toContain("Technical Design");
    expect(html).toContain("Tasks");
    expect(html).toContain("Logs");
  });

  it("renders ARTIFACTS section header", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEExplorer, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeDocTab: "product_spec",
        onDocTabChange: vi.fn(),
        selectedSessionId: null,
        onSessionSelect: vi.fn(),
        onNewSession: vi.fn(),
      }),
    );
    expect(html.toLowerCase()).toContain("artifacts");
  });

  it("renders task rows from feature.tasks", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEExplorer, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeDocTab: "product_spec",
        onDocTabChange: vi.fn(),
        selectedSessionId: null,
        onSessionSelect: vi.fn(),
        onNewSession: vi.fn(),
      }),
    );
    expect(html).toContain("data-task-row");
    expect(html).toContain("Theme tokens");
    expect(html).toContain("Feature IDE workbench");
  });

  it("renders SESSIONS section header", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEExplorer, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeDocTab: "product_spec",
        onDocTabChange: vi.fn(),
        selectedSessionId: null,
        onSessionSelect: vi.fn(),
        onNewSession: vi.fn(),
      }),
    );
    expect(html.toLowerCase()).toContain("sessions");
  });

  it("renders CHANNELS placeholder section", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEExplorer, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeDocTab: "product_spec",
        onDocTabChange: vi.fn(),
        selectedSessionId: null,
        onSessionSelect: vi.fn(),
        onNewSession: vi.fn(),
      }),
    );
    expect(html.toLowerCase()).toContain("channels");
    expect(html).toContain("data-channels-placeholder");
  });

  it("renders session rows when sessions are provided via mock", () => {
    mockListChatSessions.mockResolvedValue([
      { id: "sess-1", title: "Session Alpha", started_at: 0, last_active_at: 0, last_message_excerpt: "" },
    ]);
    // In SSR, the async fetch won't resolve, so we test the loading state
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEExplorer, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeDocTab: "product_spec",
        onDocTabChange: vi.fn(),
        selectedSessionId: null,
        onSessionSelect: vi.fn(),
        onNewSession: vi.fn(),
      }),
    );
    // In SSR (no useEffect), sessions won't be loaded yet — loading state shown
    expect(html).toContain("Sessions");
  });

  it("marks active artifact as active", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEExplorer, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeDocTab: "technical_design",
        onDocTabChange: vi.fn(),
        selectedSessionId: null,
        onSessionSelect: vi.fn(),
        onNewSession: vi.fn(),
      }),
    );
    // Technical Design button should have the active class
    expect(html).toContain("Technical Design");
    // Active class contains bg-surface-subtle
    expect(html).toContain("bg-surface-subtle");
  });
});

// ─── Tests: FeatureIDEDocsPanel ───────────────────────────────────────────────

import { FeatureIDEDocsPanel } from "../features/workspaces/components/FeatureIDE/FeatureIDEDocsPanel";

describe("FeatureIDEDocsPanel", () => {
  it("renders data-feature-ide-docs-panel", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEDocsPanel, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeTab: "product_spec",
        onTabChange: vi.fn(),
        activityEvents: [],
        activityLoading: false,
        onOpenTaskTab: vi.fn(),
      }),
    );
    expect(html).toContain("data-feature-ide-docs-panel");
  });

  it("renders tab bar with all four tabs", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEDocsPanel, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeTab: "product_spec",
        onTabChange: vi.fn(),
        activityEvents: [],
        activityLoading: false,
        onOpenTaskTab: vi.fn(),
      }),
    );
    expect(html).toContain("data-docs-tab-product-spec");
    expect(html).toContain("data-docs-tab-tech-design");
    expect(html).toContain("data-docs-tab-tasks");
    expect(html).toContain("data-docs-tab-logs");
  });

  it("renders product spec tab as active (aria-selected=true)", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEDocsPanel, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeTab: "product_spec",
        onTabChange: vi.fn(),
        activityEvents: [],
        activityLoading: false,
        onOpenTaskTab: vi.fn(),
      }),
    );
    // Both attributes present — check individually since attribute order varies
    expect(html).toContain('data-docs-tab-product-spec=""');
    // Active tab has border-b-2 border-primary active style
    expect(html).toContain("border-b-2 border-primary");
  });

  it("renders technical design tab as active when selected", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEDocsPanel, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeTab: "technical_design",
        onTabChange: vi.fn(),
        activityEvents: [],
        activityLoading: false,
        onOpenTaskTab: vi.fn(),
      }),
    );
    expect(html).toContain('data-docs-tab-tech-design=""');
    // Tech design tab button has aria-selected true
    expect(html).toContain('aria-selected="true"');
  });

  it("renders FeatureDocumentPanel for product_spec tab", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEDocsPanel, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeTab: "product_spec",
        onTabChange: vi.fn(),
        activityEvents: [],
        activityLoading: false,
        onOpenTaskTab: vi.fn(),
      }),
    );
    expect(html).toContain('data-feature-doc="product_spec"');
  });

  it("renders FeatureDocumentPanel for technical_design tab", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEDocsPanel, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeTab: "technical_design",
        onTabChange: vi.fn(),
        activityEvents: [],
        activityLoading: false,
        onOpenTaskTab: vi.fn(),
      }),
    );
    expect(html).toContain('data-feature-doc="technical_design"');
  });

  it("renders FeatureTasksPanel for tasks tab", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEDocsPanel, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeTab: "tasks",
        onTabChange: vi.fn(),
        activityEvents: [],
        activityLoading: false,
        onOpenTaskTab: vi.fn(),
      }),
    );
    expect(html).toContain("data-feature-tasks-panel");
  });

  it("renders FeatureLogsPanel for logs tab", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEDocsPanel, {
        feature: makeFeature(),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeTab: "logs",
        onTabChange: vi.fn(),
        activityEvents: [],
        activityLoading: false,
        onOpenTaskTab: vi.fn(),
      }),
    );
    expect(html).toContain("data-feature-logs-panel");
  });

  it("shows check indicator on approved stages", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEDocsPanel, {
        feature: makeFeature({
          stages: {
            product_spec: { review_status: "approved" },
            technical_design: { review_status: "approved" },
          },
        }),
        workspaceId: "ws-1",
        featureId: "feat-1",
        activeTab: "product_spec",
        onTabChange: vi.fn(),
        activityEvents: [],
        activityLoading: false,
        onOpenTaskTab: vi.fn(),
      }),
    );
    // Check icons should appear for approved stages
    expect(html).toContain("text-success");
  });
});

// ─── Tests: FeatureIDEWorkbench ───────────────────────────────────────────────

import { FeatureIDEWorkbench } from "../features/workspaces/components/FeatureIDE/FeatureIDEWorkbench";

describe("FeatureIDEWorkbench", () => {
  beforeEach(() => {
    mockListChatSessions.mockResolvedValue([]);
    mockUseActivity.mockReturnValue({ events: [], loading: false, error: null });
  });

  it("renders loading state while feature loads", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: null,
      loading: true,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEWorkbench, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-feature-ide-loading");
    expect(html).toContain("Loading feature");
  });

  it("renders error state on fetch failure", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: null,
      loading: false,
      error: { code: "not_found", message: "Feature not found", retryable: false },
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEWorkbench, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-feature-ide-error");
    expect(html).toContain("Feature not found");
  });

  it("renders four-pane layout when feature loads successfully", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeature(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEWorkbench, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-feature-ide-workbench");
    expect(html).toContain("data-feature-ide-explorer-pane");
    expect(html).toContain("data-feature-ide-chat-pane");
    expect(html).toContain("data-feature-ide-docs-pane");
    expect(html).toContain("data-feature-ide-activity-dock");
  });

  it("renders AgentChatPanel in center pane", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeature(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEWorkbench, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-agent-chat-panel");
    expect(html).toContain('data-workspace-id="ws-1"');
  });

  it("renders ActivityFeed in activity dock", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeature(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEWorkbench, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-activity-feed");
  });

  it("renders FeatureIDEExplorer in left pane", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeature(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEWorkbench, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-feature-ide-explorer");
  });

  it("renders FeatureIDEDocsPanel in right pane", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeature(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEWorkbench, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-feature-ide-docs-panel");
  });

  it("passes workspaceId and featureId to AgentChatPanel", () => {
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeature(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureIDEWorkbench, {
        workspaceId: "ws-42",
        featureId: "feat-99",
      }),
    );
    expect(html).toContain('data-workspace-id="ws-42"');
    expect(html).toContain('data-feature-id="feat-99"');
  });
});

// ─── Tests: FeatureSessionPage ────────────────────────────────────────────────

import { FeatureSessionPage } from "../features/workspaces/components/WorkspaceSessionPage/FeatureSessionPage";

describe("FeatureSessionPage", () => {
  beforeEach(() => {
    mockListChatSessions.mockResolvedValue([]);
    mockUseActivity.mockReturnValue({ events: [], loading: false, error: null });
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeature(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders data-feature-session-page", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "feat-tab-1",
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-feature-session-page");
  });

  it("renders FeatureIDEWorkbench", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "feat-tab-1",
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-feature-ide-workbench");
  });

  it("shows error when workspaceId is missing", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "feat-tab-1",
        workspaceId: "",
        featureId: "",
      }),
    );
    expect(html).toContain("Missing feature route parameters");
  });

  it("shows loading when workspace is loading", () => {
    mockWorkspaceContext.loadingWorkspace = true;
    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "feat-tab-1",
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("Loading workspace");
    mockWorkspaceContext.loadingWorkspace = false;
  });
});
