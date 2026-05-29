/**
 * T3 — Task/feature tab detail query cache migration
 *
 * Verifies:
 *   - useWorkspaceTask uses workspace-scoped query keys
 *   - useFeatureDetail uses workspace-scoped query keys
 *   - useFeatureTask uses workspace-scoped query keys
 *   - Null inputs disable the query (no unnecessary fetches)
 *   - Hooks return the expected result shape
 *   - Cached data is returned from QueryClient without a new fetch
 *   - Different workspaces use independent cache entries
 */

// @vitest-environment jsdom

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  TaskDetail,
  FeatureDetail,
} from "../services/workflow-backend/types";
import { workspaceKeys } from "../lib/query-keys";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../services/workflow-backend/client", () => ({
  getWorkspaceTask: vi.fn(),
  getFeature: vi.fn(),
  getFeatureTask: vi.fn(),
}));

import {
  getWorkspaceTask,
  getFeature,
  getFeatureTask,
} from "../services/workflow-backend/client";

import { useWorkspaceTask } from "../features/tasks/hooks/useWorkspaceTask";
import {
  useFeatureDetail,
  useFeatureTask,
} from "../features/board/hooks/useFeatureDetail";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTaskDetail(overrides: Partial<TaskDetail> = {}): TaskDetail {
  return {
    id: "task-uuid-1",
    task_id: "task-uuid-1",
    task_name: "T3",
    feature_id: "feat-uuid-1",
    feature_name: "my-feature",
    title: "Cache migration task",
    status: "in_progress",
    repo: "acme/ui",
    branch: "feature/cache-T3",
    is_blocked: false,
    pr: null,
    workspace_pr: null,
    next_action: "implement",
    blocked_reason: "",
    workspace_id: "ws-uuid-1",
    depends_on: [],
    execution: {
      actor_type: "agent",
      last_updated_by: "bot@x.com",
      last_updated_at: "2026-01-01T00:00:00Z",
    },
    pr_refs: [],
    ...overrides,
  };
}

function makeFeatureDetail(
  overrides: Partial<FeatureDetail> = {},
): FeatureDetail {
  return {
    id: "feat-uuid-1",
    feature_id: "feat-uuid-1",
    feature_name: "my-feature",
    title: "My Feature",
    status: "in_implementation",
    current_stage: "in_tdd",
    stages: {},
    updated_at: "2026-01-01T00:00:00Z",
    task_counts: { total: 0, done: 0, in_progress: 0, blocked: 0, ready: 0, todo: 0 },
    workspace_id: "ws-uuid-1",
    tasks: [],
    documents: [],
    source_state: { stale: false },
    ...overrides,
  };
}

// ─── Helper: wrap with a fresh QueryClient ────────────────────────────────────

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

// ─── useWorkspaceTask ─────────────────────────────────────────────────────────

describe("useWorkspaceTask — query key and cache behavior", () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
    });
    vi.mocked(getWorkspaceTask).mockReset();
  });

  it("fetches task data using workspace-scoped query key", async () => {
    vi.mocked(getWorkspaceTask).mockResolvedValueOnce(makeTaskDetail());

    const { result } = renderHook(
      () => useWorkspaceTask("ws-1", "task-uuid-1"),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.task).not.toBeNull();
    expect(result.current.error).toBeNull();
    expect(getWorkspaceTask).toHaveBeenCalledWith("ws-1", "task-uuid-1");
  });

  it("returns cached data on second render without a new fetch", async () => {
    vi.mocked(getWorkspaceTask).mockResolvedValueOnce(makeTaskDetail());

    const wrapper = makeWrapper(client);
    const { result: r1 } = renderHook(
      () => useWorkspaceTask("ws-1", "task-uuid-1"),
      { wrapper },
    );
    await waitFor(() => expect(r1.current.loading).toBe(false));
    expect(getWorkspaceTask).toHaveBeenCalledTimes(1);

    // Second hook in the same provider — should hit cache, not the network
    const { result: r2 } = renderHook(
      () => useWorkspaceTask("ws-1", "task-uuid-1"),
      { wrapper },
    );
    await waitFor(() => expect(r2.current.loading).toBe(false));
    expect(getWorkspaceTask).toHaveBeenCalledTimes(1); // still 1 call
    expect(r2.current.task).not.toBeNull();
  });

  it("does not fetch when workspaceId is null", async () => {
    const { result } = renderHook(() => useWorkspaceTask(null, "task-uuid-1"), {
      wrapper: makeWrapper(client),
    });
    // Give it a tick to settle
    await act(async () => {});
    expect(getWorkspaceTask).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.task).toBeNull();
  });

  it("does not fetch when taskId is null", async () => {
    const { result } = renderHook(() => useWorkspaceTask("ws-1", null), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {});
    expect(getWorkspaceTask).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.task).toBeNull();
  });

  it("exposes error from a failed fetch", async () => {
    const apiErr = {
      code: "NOT_FOUND",
      message: "Task not found",
      retryable: false,
    };
    vi.mocked(getWorkspaceTask).mockRejectedValueOnce(apiErr);

    const { result } = renderHook(() => useWorkspaceTask("ws-1", "bad-id"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toEqual(apiErr);
    expect(result.current.task).toBeNull();
  });

  it("uses independent cache entries for different workspaces", async () => {
    const task1 = makeTaskDetail({ workspace_id: "ws-1", title: "WS1 Task" });
    const task2 = makeTaskDetail({ workspace_id: "ws-2", title: "WS2 Task" });

    vi.mocked(getWorkspaceTask)
      .mockResolvedValueOnce(task1)
      .mockResolvedValueOnce(task2);

    const wrapper = makeWrapper(client);
    const { result: r1 } = renderHook(
      () => useWorkspaceTask("ws-1", "task-uuid-1"),
      { wrapper },
    );
    const { result: r2 } = renderHook(
      () => useWorkspaceTask("ws-2", "task-uuid-1"),
      { wrapper },
    );

    await waitFor(() => expect(r1.current.loading).toBe(false));
    await waitFor(() => expect(r2.current.loading).toBe(false));

    expect(r1.current.task?.title).toBe("WS1 Task");
    expect(r2.current.task?.title).toBe("WS2 Task");
    expect(getWorkspaceTask).toHaveBeenCalledTimes(2);
  });

  it("query key matches workspaceKeys.task shape", () => {
    const key = workspaceKeys.task("ws-abc", "T99");
    expect(key).toEqual(["workspace", "ws-abc", "task", "T99"]);
  });

  it("reload function triggers a new fetch", async () => {
    const task = makeTaskDetail();
    vi.mocked(getWorkspaceTask).mockResolvedValue(task);

    const { result } = renderHook(
      () => useWorkspaceTask("ws-1", "task-uuid-1"),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getWorkspaceTask).toHaveBeenCalledTimes(1);

    act(() => result.current.reload());
    await waitFor(() => expect(getWorkspaceTask).toHaveBeenCalledTimes(2));
  });
});

// ─── useFeatureDetail ─────────────────────────────────────────────────────────

describe("useFeatureDetail — query key and cache behavior", () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
    });
    vi.mocked(getFeature).mockReset();
  });

  it("fetches feature data using workspace-scoped query key", async () => {
    vi.mocked(getFeature).mockResolvedValueOnce(makeFeatureDetail());

    const { result } = renderHook(
      () => useFeatureDetail("ws-1", "feat-uuid-1"),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.feature).not.toBeNull();
    expect(result.current.error).toBeNull();
    expect(getFeature).toHaveBeenCalledWith("ws-1", "feat-uuid-1");
  });

  it("returns cached data on second render without a new fetch", async () => {
    vi.mocked(getFeature).mockResolvedValueOnce(makeFeatureDetail());

    const wrapper = makeWrapper(client);
    const { result: r1 } = renderHook(
      () => useFeatureDetail("ws-1", "feat-uuid-1"),
      { wrapper },
    );
    await waitFor(() => expect(r1.current.loading).toBe(false));
    expect(getFeature).toHaveBeenCalledTimes(1);

    const { result: r2 } = renderHook(
      () => useFeatureDetail("ws-1", "feat-uuid-1"),
      { wrapper },
    );
    await waitFor(() => expect(r2.current.loading).toBe(false));
    expect(getFeature).toHaveBeenCalledTimes(1);
    expect(r2.current.feature).not.toBeNull();
  });

  it("does not fetch when workspaceId is null", async () => {
    const { result } = renderHook(() => useFeatureDetail(null, "feat-uuid-1"), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {});
    expect(getFeature).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.feature).toBeNull();
  });

  it("does not fetch when featureId is null", async () => {
    const { result } = renderHook(() => useFeatureDetail("ws-1", null), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {});
    expect(getFeature).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.feature).toBeNull();
  });

  it("exposes error from a failed fetch", async () => {
    const apiErr = {
      code: "NOT_FOUND",
      message: "Feature not found",
      retryable: false,
    };
    vi.mocked(getFeature).mockRejectedValueOnce(apiErr);

    const { result } = renderHook(
      () => useFeatureDetail("ws-1", "bad-feature"),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toEqual(apiErr);
    expect(result.current.feature).toBeNull();
  });

  it("uses independent cache entries for different workspaces", async () => {
    const feat1 = makeFeatureDetail({
      workspace_id: "ws-1",
      title: "WS1 Feature",
    });
    const feat2 = makeFeatureDetail({
      workspace_id: "ws-2",
      title: "WS2 Feature",
    });

    vi.mocked(getFeature)
      .mockResolvedValueOnce(feat1)
      .mockResolvedValueOnce(feat2);

    const wrapper = makeWrapper(client);
    const { result: r1 } = renderHook(
      () => useFeatureDetail("ws-1", "feat-uuid-1"),
      { wrapper },
    );
    const { result: r2 } = renderHook(
      () => useFeatureDetail("ws-2", "feat-uuid-1"),
      { wrapper },
    );

    await waitFor(() => expect(r1.current.loading).toBe(false));
    await waitFor(() => expect(r2.current.loading).toBe(false));

    expect(r1.current.feature?.title).toBe("WS1 Feature");
    expect(r2.current.feature?.title).toBe("WS2 Feature");
    expect(getFeature).toHaveBeenCalledTimes(2);
  });

  it("query key matches workspaceKeys.feature shape", () => {
    const key = workspaceKeys.feature("ws-abc", "my-feature");
    expect(key).toEqual(["workspace", "ws-abc", "feature", "my-feature"]);
  });

  it("reload function triggers a new fetch", async () => {
    vi.mocked(getFeature).mockResolvedValue(makeFeatureDetail());

    const { result } = renderHook(
      () => useFeatureDetail("ws-1", "feat-uuid-1"),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getFeature).toHaveBeenCalledTimes(1);

    act(() => result.current.reload());
    await waitFor(() => expect(getFeature).toHaveBeenCalledTimes(2));
  });
});

// ─── useFeatureTask ───────────────────────────────────────────────────────────

describe("useFeatureTask — query key and cache behavior", () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
    });
    vi.mocked(getFeatureTask).mockReset();
  });

  it("fetches feature-task data using workspace-scoped query key", async () => {
    vi.mocked(getFeatureTask).mockResolvedValueOnce(makeTaskDetail());

    const { result } = renderHook(
      () => useFeatureTask("ws-1", "feat-uuid-1", "task-uuid-1"),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.task).not.toBeNull();
    expect(result.current.error).toBeNull();
    expect(getFeatureTask).toHaveBeenCalledWith(
      "ws-1",
      "feat-uuid-1",
      "task-uuid-1",
    );
  });

  it("returns cached data on second render without a new fetch", async () => {
    vi.mocked(getFeatureTask).mockResolvedValueOnce(makeTaskDetail());

    const wrapper = makeWrapper(client);
    const { result: r1 } = renderHook(
      () => useFeatureTask("ws-1", "feat-uuid-1", "task-uuid-1"),
      { wrapper },
    );
    await waitFor(() => expect(r1.current.loading).toBe(false));
    expect(getFeatureTask).toHaveBeenCalledTimes(1);

    const { result: r2 } = renderHook(
      () => useFeatureTask("ws-1", "feat-uuid-1", "task-uuid-1"),
      { wrapper },
    );
    await waitFor(() => expect(r2.current.loading).toBe(false));
    expect(getFeatureTask).toHaveBeenCalledTimes(1);
    expect(r2.current.task).not.toBeNull();
  });

  it("does not fetch when workspaceId is null", async () => {
    const { result } = renderHook(
      () => useFeatureTask(null, "feat-uuid-1", "task-uuid-1"),
      { wrapper: makeWrapper(client) },
    );
    await act(async () => {});
    expect(getFeatureTask).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.task).toBeNull();
  });

  it("does not fetch when featureId is null", async () => {
    const { result } = renderHook(
      () => useFeatureTask("ws-1", null, "task-uuid-1"),
      { wrapper: makeWrapper(client) },
    );
    await act(async () => {});
    expect(getFeatureTask).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.task).toBeNull();
  });

  it("does not fetch when taskId is null", async () => {
    const { result } = renderHook(
      () => useFeatureTask("ws-1", "feat-uuid-1", null),
      { wrapper: makeWrapper(client) },
    );
    await act(async () => {});
    expect(getFeatureTask).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.task).toBeNull();
  });

  it("exposes error from a failed fetch", async () => {
    const apiErr = {
      code: "NOT_FOUND",
      message: "Feature task not found",
      retryable: false,
    };
    vi.mocked(getFeatureTask).mockRejectedValueOnce(apiErr);

    const { result } = renderHook(
      () => useFeatureTask("ws-1", "feat-uuid-1", "bad-task"),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toEqual(apiErr);
    expect(result.current.task).toBeNull();
  });

  it("uses independent cache entries for different workspaces", async () => {
    const task1 = makeTaskDetail({
      workspace_id: "ws-1",
      title: "WS1 FeatureTask",
    });
    const task2 = makeTaskDetail({
      workspace_id: "ws-2",
      title: "WS2 FeatureTask",
    });

    vi.mocked(getFeatureTask)
      .mockResolvedValueOnce(task1)
      .mockResolvedValueOnce(task2);

    const wrapper = makeWrapper(client);
    const { result: r1 } = renderHook(
      () => useFeatureTask("ws-1", "feat-uuid-1", "task-uuid-1"),
      { wrapper },
    );
    const { result: r2 } = renderHook(
      () => useFeatureTask("ws-2", "feat-uuid-1", "task-uuid-1"),
      { wrapper },
    );

    await waitFor(() => expect(r1.current.loading).toBe(false));
    await waitFor(() => expect(r2.current.loading).toBe(false));

    expect(r1.current.task?.title).toBe("WS1 FeatureTask");
    expect(r2.current.task?.title).toBe("WS2 FeatureTask");
    expect(getFeatureTask).toHaveBeenCalledTimes(2);
  });

  it("query key matches workspaceKeys.featureTask shape", () => {
    const key = workspaceKeys.featureTask("ws-abc", "my-feature", "T7");
    expect(key).toEqual([
      "workspace",
      "ws-abc",
      "feature",
      "my-feature",
      "task",
      "T7",
    ]);
  });

  it("reload function triggers a new fetch", async () => {
    vi.mocked(getFeatureTask).mockResolvedValue(makeTaskDetail());

    const { result } = renderHook(
      () => useFeatureTask("ws-1", "feat-uuid-1", "task-uuid-1"),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getFeatureTask).toHaveBeenCalledTimes(1);

    act(() => result.current.reload());
    await waitFor(() => expect(getFeatureTask).toHaveBeenCalledTimes(2));
  });
});

// ─── Cache pre-seeding — simulates tab revisit behavior ──────────────────────

describe("Cache pre-seeding — revisit without loading wait", () => {
  beforeEach(() => {
    vi.mocked(getWorkspaceTask).mockReset();
    vi.mocked(getFeature).mockReset();
    vi.mocked(getFeatureTask).mockReset();
  });

  it("useWorkspaceTask returns pre-seeded data immediately (no loading)", () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 5 * 60 * 1000,
          refetchOnMount: false,
        },
      },
    });
    const task = makeTaskDetail();

    // Pre-seed the cache (simulates a previous visit that loaded the data)
    client.setQueryData(workspaceKeys.task("ws-1", "task-uuid-1"), task);

    const { result } = renderHook(
      () => useWorkspaceTask("ws-1", "task-uuid-1"),
      { wrapper: makeWrapper(client) },
    );

    // Data is available immediately — no loading state
    expect(result.current.loading).toBe(false);
    expect(result.current.task).toEqual(task);
    expect(getWorkspaceTask).not.toHaveBeenCalled();
  });

  it("useFeatureDetail returns pre-seeded data immediately (no loading)", () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 5 * 60 * 1000,
          refetchOnMount: false,
        },
      },
    });
    const feature = makeFeatureDetail();

    client.setQueryData(workspaceKeys.feature("ws-1", "feat-uuid-1"), feature);

    const { result } = renderHook(
      () => useFeatureDetail("ws-1", "feat-uuid-1"),
      { wrapper: makeWrapper(client) },
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.feature).toEqual(feature);
    expect(getFeature).not.toHaveBeenCalled();
  });

  it("useFeatureTask returns pre-seeded data immediately (no loading)", () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 5 * 60 * 1000,
          refetchOnMount: false,
        },
      },
    });
    const task = makeTaskDetail();

    client.setQueryData(
      workspaceKeys.featureTask("ws-1", "feat-uuid-1", "task-uuid-1"),
      task,
    );

    const { result } = renderHook(
      () => useFeatureTask("ws-1", "feat-uuid-1", "task-uuid-1"),
      { wrapper: makeWrapper(client) },
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.task).toEqual(task);
    expect(getFeatureTask).not.toHaveBeenCalled();
  });
});
