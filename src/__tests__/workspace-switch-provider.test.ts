// @vitest-environment jsdom
/**
 * T11 — WorkspaceProvider integration tests: workspace switch resets tab state.
 *
 * Uses React Testing Library renderHook in a jsdom environment to verify that
 * calling selectWorkspace(newId) fully resets openTaskTabs, openFeatureTabs,
 * activeTaskTabId, activeFeatureTabId, and localStorage filter keys.
 */

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks (hoisted before any real imports) ────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/services/workflow-backend", () => ({
  getWorkspace: vi.fn(() => new Promise(() => {})), // intentionally never resolves
  importWorkspace: vi.fn(),
  syncWorkspace: vi.fn(),
}));

// ─── Imports ────────────────────────────────────────────────────────────────

import {
  WorkspaceProvider,
  useWorkspaceContext,
} from "../features/workspaces/context/WorkspaceContext";
import {
  saveStatusFilter,
  saveFeatureStatusFilter,
  saveBoardMode,
  getStoredStatusFilter,
  getStoredFeatureStatusFilter,
  getStoredBoardMode,
} from "../features/board/lib/status-filter-store";

// ─── localStorage seed helpers ───────────────────────────────────────────────

const SUMMARIES_KEY = "dashboard:workspace-summaries";
const SELECTED_ID_KEY = "dashboard:workspace-selected-id";

const WS_A = {
  workspaceId: "ws-a",
  name: "Workspace A",
  repo_url: "https://github.com/acme/ws-a.git",
  default_branch: "main",
  last_opened_at: "2026-01-01T00:00:00Z",
};

const WS_B = {
  workspaceId: "ws-b",
  name: "Workspace B",
  repo_url: "https://github.com/acme/ws-b.git",
  default_branch: "main",
  last_opened_at: "2026-01-02T00:00:00Z",
};

function seedLocalStorage() {
  localStorage.setItem(SUMMARIES_KEY, JSON.stringify([WS_A, WS_B]));
  localStorage.setItem(SELECTED_ID_KEY, "ws-a");
}

// ─── Test wrapper ────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(WorkspaceProvider, null, children);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("WorkspaceProvider — selectWorkspace resets all tab and filter state", () => {
  beforeEach(() => {
    localStorage.clear();
    seedLocalStorage();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("resets openTaskTabs, openFeatureTabs, activeTaskTabId, and activeFeatureTabId on workspace switch", async () => {
    const { result } = renderHook(() => useWorkspaceContext(), { wrapper });

    // Open a task tab for ws-a
    act(() => {
      result.current.openTaskTab({
        taskId: "T1",
        taskName: "T1",
        title: "Setup CI",
      });
    });

    // Open a feature tab for ws-a
    act(() => {
      result.current.openFeatureTab({
        featureId: "feat-auth",
        featureName: "auth",
        title: "Auth module",
      });
    });

    // Confirm tabs are open
    expect(result.current.openTaskTabs).toHaveLength(1);
    expect(result.current.activeTaskTabId).not.toBeNull();
    expect(result.current.openFeatureTabs).toHaveLength(1);
    expect(result.current.activeFeatureTabId).not.toBeNull();

    // Seed persisted board filter state (as if set during the ws-a session)
    saveStatusFilter(["in_progress", "blocked"]);
    saveFeatureStatusFilter(["in_implementation", "in_handoff"]);
    saveBoardMode("feature");

    // Switch to workspace B
    act(() => {
      result.current.selectWorkspace("ws-b");
    });

    // Tab state must be fully reset
    expect(result.current.openTaskTabs).toHaveLength(0);
    expect(result.current.openFeatureTabs).toHaveLength(0);
    expect(result.current.activeTaskTabId).toBeNull();
    expect(result.current.activeFeatureTabId).toBeNull();
    expect(result.current.activeSurface).toBe("board");

    // localStorage filter keys must be removed so the new BoardProvider
    // starts with factory defaults instead of stale values from ws-a
    expect(getStoredStatusFilter()).toBeNull();
    expect(getStoredFeatureStatusFilter()).toBeNull();
    expect(getStoredBoardMode()).toBeNull();
  });

  it("resets state even when multiple task and feature tabs were open", async () => {
    const { result } = renderHook(() => useWorkspaceContext(), { wrapper });

    act(() => {
      result.current.openTaskTab({ taskId: "T1", taskName: "T1", title: "Task 1" });
    });
    act(() => {
      result.current.openTaskTab(
        { taskId: "T2", taskName: "T2", title: "Task 2" },
        { forceNewSession: true },
      );
    });
    act(() => {
      result.current.openFeatureTab({ featureId: "f1", featureName: "feat-1", title: "F1" });
    });
    act(() => {
      result.current.openFeatureTab(
        { featureId: "f2", featureName: "feat-2", title: "F2" },
        { forceNewSession: true },
      );
    });

    expect(result.current.openTaskTabs).toHaveLength(2);
    expect(result.current.openFeatureTabs).toHaveLength(2);

    act(() => {
      result.current.selectWorkspace("ws-b");
    });

    expect(result.current.openTaskTabs).toHaveLength(0);
    expect(result.current.openFeatureTabs).toHaveLength(0);
    expect(result.current.activeTaskTabId).toBeNull();
    expect(result.current.activeFeatureTabId).toBeNull();
  });

  it("sets activeSurface back to board after workspace switch", async () => {
    const { result } = renderHook(() => useWorkspaceContext(), { wrapper });

    act(() => {
      result.current.openFeatureTab({
        featureId: "f1",
        featureName: "feat-1",
        title: "Feature 1",
      });
    });

    expect(result.current.activeSurface).toBe("feature-tab");

    act(() => {
      result.current.selectWorkspace("ws-b");
    });

    expect(result.current.activeSurface).toBe("board");
  });
});
