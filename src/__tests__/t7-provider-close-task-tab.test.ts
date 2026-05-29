/**
 * T7 — Provider-level tests: closeTaskTab with parentFeatureTabSessionId
 *
 * Tests the actual WorkspaceProvider closeTaskTab behavior:
 *   - direct board-origin task tab Back → /board
 *   - feature-origin task tab Back → reactivates parent feature tab
 *   - parent feature tab stays open after feature-origin task tab closes
 *   - fallback to /board when parent feature tab is not found
 */

// @vitest-environment jsdom

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks (hoisted before any real imports) ────────────────────────────────

const routerPushMock = vi.hoisted(() => vi.fn());
const routerReplaceMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock, replace: routerReplaceMock }),
}));

vi.mock("@/services/workflow-backend", () => ({
  getWorkspace: vi.fn(() => new Promise(() => {})),
  importWorkspace: vi.fn(),
  syncWorkspace: vi.fn(),
}));

// ─── Imports ────────────────────────────────────────────────────────────────

import {
  WorkspaceProvider,
  useWorkspaceContext,
} from "../features/workspaces/context/WorkspaceContext";

// ─── localStorage seed ──────────────────────────────────────────────────────

const SUMMARIES_KEY = "dashboard:workspace-summaries";
const SELECTED_ID_KEY = "dashboard:workspace-selected-id";

function seedLocalStorage() {
  const WS = {
    workspaceId: "ws-t7",
    name: "T7 Provider Test Workspace",
    repo_url: "https://github.com/acme/t7-provider.git",
    default_branch: "main",
    last_opened_at: "2026-01-01T00:00:00Z",
  };
  localStorage.setItem(SUMMARIES_KEY, JSON.stringify([WS]));
  localStorage.setItem(SELECTED_ID_KEY, "ws-t7");
}

// ─── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(WorkspaceProvider, null, children),
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("WorkspaceProvider.closeTaskTab — feature-origin return behavior", () => {
  beforeEach(() => {
    localStorage.clear();
    seedLocalStorage();
    routerPushMock.mockClear();
    routerReplaceMock.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns to /board when no parentFeatureTabSessionId (direct board-origin)", () => {
    const { result } = renderHook(() => useWorkspaceContext(), { wrapper });

    // Open a direct board-origin task tab (no parent feature context)
    act(() => {
      result.current.openTaskTab({
        taskId: "direct-task",
        taskName: "D1",
        title: "Direct Task",
      });
    });

    const taskTabSessionId = result.current.activeTaskTabId;
    expect(taskTabSessionId).not.toBeNull();
    expect(result.current.openTaskTabs).toHaveLength(1);

    // Close the direct-origin task tab
    act(() => {
      result.current.closeTaskTab(taskTabSessionId!);
    });

    // Task tab is removed
    expect(result.current.openTaskTabs).toHaveLength(0);
    // Returns to board
    expect(result.current.activeSurface).toBe("board");
    expect(result.current.activeTaskTabId).toBeNull();
    expect(result.current.activeFeatureTabId).toBeNull();
  });

  it("reactivates parent feature tab when parentFeatureTabSessionId is set", () => {
    const { result } = renderHook(() => useWorkspaceContext(), { wrapper });

    // Open a feature tab first
    act(() => {
      result.current.openFeatureTab({
        featureId: "feat-origin",
        featureName: "origin-feature",
        title: "Origin Feature",
      });
    });

    const parentFeatureTabId = result.current.activeFeatureTabId;
    expect(parentFeatureTabId).not.toBeNull();
    expect(result.current.openFeatureTabs).toHaveLength(1);

    // Open a task tab from within the feature tab (store parent context)
    act(() => {
      result.current.openTaskTab({
        taskId: "feat-task",
        taskName: "FT1",
        title: "Feature Task",
        parentFeatureTabSessionId: parentFeatureTabId!,
      });
    });

    const taskTabSessionId = result.current.activeTaskTabId;
    expect(taskTabSessionId).not.toBeNull();
    expect(result.current.openTaskTabs).toHaveLength(1);
    expect(result.current.activeSurface).toBe("task-tab");

    // Close the feature-origin task tab
    act(() => {
      result.current.closeTaskTab(taskTabSessionId!);
    });

    // Task tab is removed
    expect(result.current.openTaskTabs).toHaveLength(0);
    // Parent feature tab is reactivated
    expect(result.current.activeSurface).toBe("feature-tab");
    expect(result.current.activeFeatureTabId).toBe(parentFeatureTabId);
    expect(result.current.activeTaskTabId).toBeNull();
  });

  it("keeps parent feature tab open after feature-origin task tab closes", () => {
    const { result } = renderHook(() => useWorkspaceContext(), { wrapper });

    act(() => {
      result.current.openFeatureTab({
        featureId: "feat-persist",
        featureName: "persist-feature",
        title: "Persist Feature",
      });
    });

    const parentFeatureTabId = result.current.activeFeatureTabId;
    expect(result.current.openFeatureTabs).toHaveLength(1);

    act(() => {
      result.current.openTaskTab({
        taskId: "persist-task",
        taskName: "PT1",
        title: "Persist Task",
        parentFeatureTabSessionId: parentFeatureTabId!,
      });
    });

    const taskTabSessionId = result.current.activeTaskTabId;
    expect(taskTabSessionId).not.toBeNull();

    // Close the feature-origin task tab
    act(() => {
      result.current.closeTaskTab(taskTabSessionId!);
    });

    // Feature tab is still open (not removed)
    expect(result.current.openFeatureTabs).toHaveLength(1);
    expect(result.current.openFeatureTabs[0]?.sessionId).toBe(
      parentFeatureTabId,
    );
  });

  it("falls back to /board when parent feature tab session not found", () => {
    const { result } = renderHook(() => useWorkspaceContext(), { wrapper });

    // Open a task tab with a parentFeatureTabSessionId that doesn't match any
    // open feature tab (e.g., feature tab was closed independently)
    act(() => {
      result.current.openTaskTab({
        taskId: "orphan-task",
        taskName: "OT1",
        title: "Orphan Task",
        parentFeatureTabSessionId: "nonexistent-feature-session",
      });
    });

    const taskTabSessionId = result.current.activeTaskTabId;
    expect(taskTabSessionId).not.toBeNull();

    act(() => {
      result.current.closeTaskTab(taskTabSessionId!);
    });

    // Falls back to board
    expect(result.current.openTaskTabs).toHaveLength(0);
    expect(result.current.activeSurface).toBe("board");
    expect(result.current.activeTaskTabId).toBeNull();
    expect(result.current.activeFeatureTabId).toBeNull();
  });
});
