/**
 * T4 — FeatureSessionPage three-panel layout
 *
 * Covers:
 *   - Three panels (left/center/right) + two collapse toggles are rendered
 *   - Left panel is w-0 when collapsed, w-64 when expanded
 *   - Right panel is w-0 when collapsed, w-96 when expanded
 *   - Flex container uses min-h-0 flex-1 overflow-hidden
 *   - Error state when workspaceId is missing
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>;
  return {
    ...original,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

vi.mock("../features/board/components/FeatureTabView/FeatureTabView", () => ({
  FeatureTabView: () => React.createElement("div", { "data-feature-tab-view": "" }),
}));

vi.mock("../features/agent-chat", () => ({
  AgentChatPanel: () => React.createElement("div", { "data-agent-chat-panel": "" }),
}));

vi.mock("../features/feature-status/FeatureStatusPanel", () => ({
  FeatureStatusPanel: () => React.createElement("div", { "data-feature-status-panel": "" }),
}));

vi.mock("../features/feature-status/CollapseToggle", () => ({
  CollapseToggle: ({ side, collapsed }: { side: string; collapsed: boolean }) =>
    React.createElement("button", {
      "data-collapse-toggle": "",
      "data-side": side,
      "data-collapsed": String(collapsed),
    }),
}));

vi.mock("../features/workspaces/components/WorkspaceSessionPage/WorkspaceSessionShared", async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>;
  return {
    ...original,
    WorkspaceSessionShell: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-workspace-shell": "" }, children),
  };
});

const mockWorkspaceCtxLayout = vi.hoisted(() => ({
  activeSurface: "board" as string,
  activeTaskTabId: null as string | null,
  activeFeatureTabId: null as string | null,
  openTaskTabs: [] as unknown[],
  openFeatureTabs: [] as unknown[],
  activeWorkspace: {
    id: "ws-1",
    name: "Test WS",
    slug: "test-ws",
    source_state: { stale: false },
    features: [],
    tasks: [],
  },
  loadingWorkspace: false,
  workspaceError: null,
  selectedWorkspaceId: "ws-1",
  selectWorkspace: vi.fn(),
  openTaskTab: vi.fn(),
  closeTaskTab: vi.fn(),
  activateTaskTab: vi.fn(),
  openFeatureTab: vi.fn(),
  closeFeatureTab: vi.fn(),
  activateFeatureTab: vi.fn(),
  markFeatureTabActive: vi.fn(),
  goToBoard: vi.fn(),
  setActiveSurface: vi.fn(),
}));

vi.mock("../features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockWorkspaceCtxLayout,
}));

vi.mock("../hooks/useLocalStorage", () => ({
  useLocalStorage: vi.fn(),
}));

import { useLocalStorage as useLocalStorageMock } from "../hooks/useLocalStorage";
import { FeatureSessionPage } from "../features/workspaces/components/WorkspaceSessionPage/FeatureSessionPage";

describe("FeatureSessionPage three-panel layout", () => {
  beforeEach(() => {
    (useLocalStorageMock as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === "df-left-panel-collapsed") return [false, vi.fn()];
        if (key === "df-right-panel-collapsed") return [false, vi.fn()];
        return [false, vi.fn()];
      },
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders all three panels and two collapse toggles", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "sess-1",
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-feature-status-panel");
    expect(html).toContain("data-feature-tab-view");
    expect(html).toContain("data-agent-chat-panel");
    expect(html).toContain('data-side="left"');
    expect(html).toContain('data-side="right"');
  });

  it("left panel is w-64 when not collapsed", () => {
    (useLocalStorageMock as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === "df-left-panel-collapsed") return [false, vi.fn()];
        return [false, vi.fn()];
      },
    );

    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "sess-1",
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-left-panel");
    expect(html).toMatch(/data-left-panel[^>]*class="[^"]*w-64/);
  });

  it("left panel is w-0 when collapsed", () => {
    (useLocalStorageMock as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === "df-left-panel-collapsed") return [true, vi.fn()];
        return [false, vi.fn()];
      },
    );

    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "sess-1",
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-left-panel");
    expect(html).toMatch(/data-left-panel[^>]*class="[^"]*w-0/);
  });

  it("right panel is w-96 when not collapsed", () => {
    (useLocalStorageMock as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === "df-right-panel-collapsed") return [false, vi.fn()];
        return [false, vi.fn()];
      },
    );

    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "sess-1",
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-right-panel");
    expect(html).toMatch(/data-right-panel[^>]*class="[^"]*w-96/);
  });

  it("right panel is w-0 when collapsed", () => {
    (useLocalStorageMock as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === "df-right-panel-collapsed") return [true, vi.fn()];
        return [false, vi.fn()];
      },
    );

    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "sess-1",
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("data-right-panel");
    expect(html).toMatch(/data-right-panel[^>]*class="[^"]*w-0/);
  });

  it("shows error state when workspaceId is missing", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "sess-1",
        workspaceId: "",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("Missing feature route parameters");
  });

  it("flex container uses min-h-0 flex-1 overflow-hidden", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "sess-1",
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );
    expect(html).toMatch(/class="[^"]*flex[^"]*min-h-0[^"]*flex-1[^"]*overflow-hidden/);
  });
});
