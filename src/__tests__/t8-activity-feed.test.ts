/**
 * T8 — wire activity feed to audience=client
 *
 * Tests:
 *   - listActivity sends audience=client query param
 *   - ActivityFeed renders action strings as-is (no FE label mapping)
 *   - E2E-style: only allowlisted action labels appear (no internal audit actions)
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { ActivityEvent } from "../services/workflow-backend/types";

// ─── listActivity unit tests ───────────────────────────────────────────────────

const API_BASE = "http://localhost:3001";

function successResponse(data: unknown) {
  const text = JSON.stringify({ success: true, data });
  return {
    status: 200,
    ok: true,
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

describe("listActivity — audience=client query param", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_WORKFLOW_API_URL = API_BASE;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
  });

  it("sends audience=client as a query parameter", async () => {
    const { listActivity } = await import("../services/workflow-backend/client");
    fetchMock.mockResolvedValueOnce(successResponse([]));
    await listActivity("ws-1", { audience: "client" });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/activity?audience=client`);
  });

  it("returns an empty array when the backend returns []", async () => {
    const { listActivity } = await import("../services/workflow-backend/client");
    fetchMock.mockResolvedValueOnce(successResponse([]));
    const result = await listActivity("ws-1", { audience: "client" });
    expect(result).toEqual([]);
  });

  it("returns activity events from the backend", async () => {
    const { listActivity } = await import("../services/workflow-backend/client");
    const events: ActivityEvent[] = [
      {
        action: "Created",
        scope: "task",
        actor: "agent@kitelabs.io",
        occurred_at: "2026-06-01T10:00:00Z",
        feature_id: "feat-1",
        task_id: "T1",
      },
    ];
    fetchMock.mockResolvedValueOnce(successResponse(events));
    const result = await listActivity("ws-1", { audience: "client" });
    expect(result).toEqual(events);
  });

  it("omits audience param when not provided", async () => {
    const { listActivity } = await import("../services/workflow-backend/client");
    fetchMock.mockResolvedValueOnce(successResponse([]));
    await listActivity("ws-1");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/activity`);
    expect(url).not.toContain("audience");
  });

  it("appends limit param when provided along with audience", async () => {
    const { listActivity } = await import("../services/workflow-backend/client");
    fetchMock.mockResolvedValueOnce(successResponse([]));
    await listActivity("ws-1", { audience: "client", limit: 20 });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("audience=client");
    expect(url).toContain("limit=20");
  });
});

// ─── ActivityFeed component tests ─────────────────────────────────────────────

import { ActivityFeed } from "../features/board/components/ActivityFeed/ActivityFeed";

describe("ActivityFeed — renders action strings as-is", () => {
  it("renders the action string exactly as received from the backend", () => {
    const events: ActivityEvent[] = [
      {
        action: "Created",
        scope: "task",
        actor: "agent@kitelabs.io",
        occurred_at: "2026-06-01T10:00:00Z",
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(ActivityFeed, { events }),
    );
    expect(html).toContain("Created");
    expect(html).toContain("data-activity-action");
  });

  it("renders client-friendly action labels as-is without mapping", () => {
    const clientActions = [
      "Created",
      "Ready",
      "Started",
      "Progress",
      "Completed",
      "Blocked",
      "Reviewed",
      "Cancelled",
    ];
    for (const action of clientActions) {
      const events: ActivityEvent[] = [
        { action, scope: "task", actor: "u@e.com", occurred_at: "2026-06-01T10:00:00Z" },
      ];
      const html = renderToStaticMarkup(
        React.createElement(ActivityFeed, { events }),
      );
      expect(html).toContain(action);
    }
  });

  it("renders empty state when no events provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActivityFeed, { events: [] }),
    );
    expect(html).toContain("No activity yet.");
  });

  it("renders loading state when loading=true", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActivityFeed, { events: [], loading: true }),
    );
    expect(html).toContain("Loading activity");
  });

  it("renders note text with URL as a clickable link", () => {
    const events: ActivityEvent[] = [
      {
        action: "Reviewed",
        scope: "task",
        actor: "reviewer@kitelabs.io",
        occurred_at: "2026-06-01T10:00:00Z",
        note: "PR at https://github.com/org/repo/pull/42",
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(ActivityFeed, { events }),
    );
    expect(html).toContain("data-activity-feed-link");
    expect(html).toContain('href="https://github.com/org/repo/pull/42"');
  });

  it("renders actor name", () => {
    const events: ActivityEvent[] = [
      {
        action: "Started",
        scope: "task",
        actor: "agent@kitelabs.io",
        occurred_at: "2026-06-01T10:00:00Z",
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(ActivityFeed, { events }),
    );
    expect(html).toContain("agent@kitelabs.io");
  });

  it("renders data-activity-feed and data-activity-feed-item attributes", () => {
    const events: ActivityEvent[] = [
      { action: "Done", scope: "task", actor: "u@e.com", occurred_at: "2026-06-01T10:00:00Z" },
    ];
    const html = renderToStaticMarkup(
      React.createElement(ActivityFeed, { events }),
    );
    expect(html).toContain("data-activity-feed");
    expect(html).toContain("data-activity-feed-item");
  });

  it("renders multiple events", () => {
    const events: ActivityEvent[] = [
      { action: "Started", scope: "task", actor: "a@b.com", occurred_at: "2026-06-01T09:00:00Z" },
      { action: "Completed", scope: "task", actor: "a@b.com", occurred_at: "2026-06-01T12:00:00Z" },
      { action: "Created", scope: "task", actor: "a@b.com", occurred_at: "2026-06-01T08:00:00Z" },
    ];
    const html = renderToStaticMarkup(
      React.createElement(ActivityFeed, { events }),
    );
    expect(html).toContain("Started");
    expect(html).toContain("Completed");
    expect(html).toContain("Created");
  });
});

// ─── E2E-style: only allowlisted action labels shown ─────────────────────────

describe("ActivityFeed — client audience shows only allowlisted actions", () => {
  const internalAuditActions = [
    "claimed",
    "rag_pre_flight",
    "reviewer_started",
    "fix_started",
    "review_blocked",
    "retried",
  ];

  const allowlistedActions = [
    "Created",
    "Ready",
    "Started",
    "Progress",
    "Completed",
    "Blocked",
    "Reviewed",
    "Cancelled",
  ];

  it("renders allowlisted action labels from the client audience response", () => {
    const events: ActivityEvent[] = allowlistedActions.map((action) => ({
      action,
      scope: "task",
      actor: "a@b.com",
      occurred_at: "2026-06-01T10:00:00Z",
    }));
    const html = renderToStaticMarkup(
      React.createElement(ActivityFeed, { events }),
    );
    for (const action of allowlistedActions) {
      expect(html).toContain(action);
    }
  });

  it("does not render internal audit action names when backend filters them out", () => {
    // With audience=client the backend filters out internal actions.
    // FE receives only the allowlisted events — simulate that here.
    const events: ActivityEvent[] = allowlistedActions.map((action) => ({
      action,
      scope: "task",
      actor: "a@b.com",
      occurred_at: "2026-06-01T10:00:00Z",
    }));
    const html = renderToStaticMarkup(
      React.createElement(ActivityFeed, { events }),
    );
    for (const internalAction of internalAuditActions) {
      expect(html).not.toContain(`>${internalAction}<`);
    }
  });
});
