/**
 * T6 — artifact_saved handler + document refresh
 *
 * Covers:
 *   - FeatureSessionPage.handleArtifactSaved calls queryClient.invalidateQueries
 *     with workspaceKeys.feature(workspaceId, featureId) when artifact_saved fires
 *   - workspaceKeys.feature produces a stable, workspace+feature-scoped key
 *   - AgentChatPanel fires onArtifactSaved on artifact_saved SSE event
 */

// @vitest-environment jsdom

import React from "react";
import { render, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { workspaceKeys } from "../lib/query-keys";

// ─── workspaceKeys.feature ────────────────────────────────────────────────────

describe("workspaceKeys.feature", () => {
  it("produces a stable key scoped to workspace and feature", () => {
    const a = workspaceKeys.feature("ws-1", "feat-1");
    const b = workspaceKeys.feature("ws-1", "feat-1");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("differs for different workspace IDs", () => {
    const a = workspaceKeys.feature("ws-1", "feat-1");
    const b = workspaceKeys.feature("ws-2", "feat-1");
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("differs for different feature IDs", () => {
    const a = workspaceKeys.feature("ws-1", "feat-1");
    const b = workspaceKeys.feature("ws-1", "feat-2");
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("includes both workspace and feature segments", () => {
    const key = workspaceKeys.feature("ws-abc", "feat-xyz");
    const str = JSON.stringify(key);
    expect(str).toContain("ws-abc");
    expect(str).toContain("feat-xyz");
  });
});

// ─── FeatureSessionPage: handleArtifactSaved wiring ──────────────────────────

// Mock heavy deps so the component can be rendered in jsdom without full Next.js
vi.mock("../features/board/components/FeatureTabView/FeatureTabView", () => ({
  FeatureTabView: () => React.createElement("div", { "data-feature-tab-view": "" }),
}));

// AgentChatPanel: capture onArtifactSaved so the test can invoke it
const capturedCallbacks = { onArtifactSaved: null as ((artifact: string) => void) | null };
vi.mock("../features/agent-chat", () => ({
  AgentChatPanel: (props: { onArtifactSaved?: (artifact: string) => void }) => {
    capturedCallbacks.onArtifactSaved = props.onArtifactSaved ?? null;
    return React.createElement("div", { "data-agent-chat-panel": "" });
  },
}));

// Stub WorkspaceSessionShell and useWorkspaceRoute so we don't need providers
vi.mock("../features/workspaces/components/WorkspaceSessionPage/WorkspaceSessionShared", async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>;
  return {
    ...original,
    WorkspaceSessionShell: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-workspace-shell": "" }, children),
    useWorkspaceRoute: () => ({
      activeWorkspace: { id: "ws-1", name: "Test", slug: "test", source_state: null, features: [], tasks: [] },
      loadingWorkspace: false,
      workspaceError: null,
      isReady: true,
    }),
  };
});

vi.mock("../features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => ({
    markFeatureTabActive: vi.fn(),
  }),
}));

import { FeatureSessionPage } from "../features/workspaces/components/WorkspaceSessionPage/FeatureSessionPage";

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe("FeatureSessionPage — artifact_saved invalidates query cache", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    capturedCallbacks.onArtifactSaved = null;
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it("calls invalidateQueries with workspaceKeys.feature when onArtifactSaved fires", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const Wrapper = makeWrapper(queryClient);
    render(
      React.createElement(Wrapper, null,
        React.createElement(FeatureSessionPage, {
          sessionId: "sess-1",
          workspaceId: "ws-1",
          featureId: "feat-1",
        }),
      ),
    );

    // The AgentChatPanel mock should have captured the onArtifactSaved prop
    expect(capturedCallbacks.onArtifactSaved).not.toBeNull();

    // Simulate the artifact_saved event firing
    await act(async () => {
      capturedCallbacks.onArtifactSaved!("product_spec");
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: workspaceKeys.feature("ws-1", "feat-1"),
    });
  });

  it("invalidates with the correct feature key for technical_design too", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const Wrapper = makeWrapper(queryClient);
    render(
      React.createElement(Wrapper, null,
        React.createElement(FeatureSessionPage, {
          sessionId: "sess-2",
          workspaceId: "ws-99",
          featureId: "feat-42",
        }),
      ),
    );

    await act(async () => {
      capturedCallbacks.onArtifactSaved!("technical_design");
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: workspaceKeys.feature("ws-99", "feat-42"),
    });
  });

  it("does not invalidate unrelated feature keys", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const Wrapper = makeWrapper(queryClient);
    render(
      React.createElement(Wrapper, null,
        React.createElement(FeatureSessionPage, {
          sessionId: "sess-3",
          workspaceId: "ws-1",
          featureId: "feat-1",
        }),
      ),
    );

    await act(async () => {
      capturedCallbacks.onArtifactSaved!("product_spec");
    });

    // Should only be called once
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    // The key passed should NOT reference a different feature
    const callArg = invalidateSpy.mock.calls[0][0] as { queryKey: readonly unknown[] };
    expect(JSON.stringify(callArg.queryKey)).not.toContain("feat-2");
  });
});

// ─── AgentChatPanel fires onArtifactSaved on artifact_saved SSE event ─────────
// The full SSE parsing path is covered in agent-chat.test.ts.
// Here we confirm the captured callback is callable and forwards the artifact type:

describe("AgentChatPanel — onArtifactSaved prop passthrough", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    capturedCallbacks.onArtifactSaved = null;
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it("passes onArtifactSaved down to AgentChatPanel and it is callable", async () => {
    const Wrapper = makeWrapper(queryClient);
    render(
      React.createElement(Wrapper, null,
        React.createElement(FeatureSessionPage, {
          sessionId: "sess-1",
          workspaceId: "ws-1",
          featureId: "feat-1",
        }),
      ),
    );

    expect(capturedCallbacks.onArtifactSaved).not.toBeNull();
    expect(() => capturedCallbacks.onArtifactSaved!("product_spec")).not.toThrow();
  });

  it("forwards technical_design artifact type without error", async () => {
    const Wrapper = makeWrapper(queryClient);
    render(
      React.createElement(Wrapper, null,
        React.createElement(FeatureSessionPage, {
          sessionId: "sess-1",
          workspaceId: "ws-1",
          featureId: "feat-1",
        }),
      ),
    );

    expect(() => capturedCallbacks.onArtifactSaved!("technical_design")).not.toThrow();
  });
});
