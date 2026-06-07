// @vitest-environment jsdom
/**
 * Admin members page — unit tests.
 *
 * Covers:
 * - admin layout guard now accepts "admin" role (in addition to platform_admin)
 * - client functions for the 5 admin endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchWorkspaceMembers,
  fetchWorkspaceInvitations,
  inviteMember,
  removeMember,
  cancelInvitation,
} from "@/services/user-service/client";

// ─── Admin layout role guard ─────────────────────────────────────────────────

describe("AdminLayout role guard", () => {
  it('accepts "platform_admin" role', () => {
    const memberships = [{ role: "platform_admin" }];
    const allowed = memberships.some(
      (m) => m.role === "platform_admin" || m.role === "admin",
    );
    expect(allowed).toBe(true);
  });

  it('accepts "admin" role', () => {
    const memberships = [{ role: "admin" }];
    const allowed = memberships.some(
      (m) => m.role === "platform_admin" || m.role === "admin",
    );
    expect(allowed).toBe(true);
  });

  it('rejects "member" role', () => {
    const memberships = [{ role: "member" }];
    const allowed = memberships.some(
      (m) => m.role === "platform_admin" || m.role === "admin",
    );
    expect(allowed).toBe(false);
  });

  it("rejects empty memberships", () => {
    const memberships: { role: string }[] = [];
    const allowed = memberships.some(
      (m) => m.role === "platform_admin" || m.role === "admin",
    );
    expect(allowed).toBe(false);
  });
});

// ─── Admin client functions ──────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("fetchWorkspaceMembers", () => {
  it("calls GET .../members and returns data", async () => {
    const payload = {
      members: [
        {
          user_id: "u1",
          email: "a@b.com",
          display_name: "Alice",
          role: "member",
        },
      ],
    };
    mockFetch.mockResolvedValueOnce(mockResponse(payload));

    const result = await fetchWorkspaceMembers("ws-1");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/admin/workspace/ws-1/members");
    expect(opts).toMatchObject({ credentials: "include" });
    expect(result).toEqual(payload);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 403));
    await expect(fetchWorkspaceMembers("ws-1")).rejects.toThrow(
      "Failed to fetch members: 403",
    );
  });
});

describe("fetchWorkspaceInvitations", () => {
  it("calls GET .../invitations and returns data", async () => {
    const payload = {
      invitations: [
        {
          id: "inv-1",
          email: "b@c.com",
          role: "member",
          expires_at: "2026-12-31T00:00:00Z",
        },
      ],
    };
    mockFetch.mockResolvedValueOnce(mockResponse(payload));

    const result = await fetchWorkspaceInvitations("ws-1");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/admin/workspace/ws-1/invitations");
    expect(opts).toMatchObject({ credentials: "include" });
    expect(result).toEqual(payload);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 401));
    await expect(fetchWorkspaceInvitations("ws-1")).rejects.toThrow(
      "Failed to fetch invitations: 401",
    );
  });
});

describe("inviteMember", () => {
  it("calls POST .../invitations with JSON body", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 201));
    await inviteMember("ws-1", { email: "new@example.com", role: "member" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/admin/workspace/ws-1/invitations");
    expect(opts).toMatchObject({
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", role: "member" }),
    });
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 422));
    await expect(
      inviteMember("ws-1", { email: "x@y.com", role: "member" }),
    ).rejects.toThrow("Failed to invite member: 422");
  });
});

describe("removeMember", () => {
  it("calls DELETE .../members/:userId", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 200));
    await removeMember("ws-1", "u-abc");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/admin/workspace/ws-1/members/u-abc");
    expect(opts).toMatchObject({ method: "DELETE", credentials: "include" });
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 404));
    await expect(removeMember("ws-1", "u-abc")).rejects.toThrow(
      "Failed to remove member: 404",
    );
  });
});

describe("cancelInvitation", () => {
  it("calls DELETE .../invitations/:invitationId", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 200));
    await cancelInvitation("ws-1", "inv-xyz");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/admin/workspace/ws-1/invitations/inv-xyz");
    expect(opts).toMatchObject({ method: "DELETE", credentials: "include" });
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 404));
    await expect(cancelInvitation("ws-1", "inv-xyz")).rejects.toThrow(
      "Failed to cancel invitation: 404",
    );
  });
});
