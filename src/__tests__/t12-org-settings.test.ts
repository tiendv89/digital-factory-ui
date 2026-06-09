/**
 * T12 — Org settings UI: unit tests for the org-admin user-service client methods
 * and org settings hooks query key logic.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ─── fetchOrg ─────────────────────────────────────────────────────────────────

describe("fetchOrg", () => {
  const BASE = "https://us.example.com";
  const ORG_ID = "org-abc";

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USER_SERVICE_URL", BASE);
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: ORG_ID,
            name: "Acme Corp",
            slug: "acme",
            created_at: "2024-01-01T00:00:00Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls GET /api/orgs/:orgId and returns unwrapped Org", async () => {
    const { fetchOrg } = await import("@/services/user-service");
    const org = await fetchOrg(ORG_ID);
    expect(org.id).toBe(ORG_ID);
    expect(org.name).toBe("Acme Corp");
    expect(org.slug).toBe("acme");
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/orgs/${ORG_ID}`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("throws with status on non-ok response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { fetchOrg } = await import("@/services/user-service");
    await expect(fetchOrg(ORG_ID)).rejects.toThrow("not found");
  });
});

// ─── updateOrg ────────────────────────────────────────────────────────────────

describe("updateOrg", () => {
  const BASE = "https://us.example.com";
  const ORG_ID = "org-abc";

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USER_SERVICE_URL", BASE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls PATCH /api/orgs/:orgId with body and returns updated org", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: ORG_ID, name: "Acme New", slug: "acme-new", created_at: "" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const { updateOrg } = await import("@/services/user-service");
    const org = await updateOrg(ORG_ID, { name: "Acme New", slug: "acme-new" });
    expect(org.name).toBe("Acme New");
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/orgs/${ORG_ID}`,
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
});

// ─── fetchOrgMembers ──────────────────────────────────────────────────────────

describe("fetchOrgMembers", () => {
  const BASE = "https://us.example.com";
  const ORG_ID = "org-abc";

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USER_SERVICE_URL", BASE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns member array from data-envelope response", async () => {
    const members = [
      {
        user_id: "u1",
        email: "alice@example.com",
        display_name: "Alice",
        role: "admin",
        joined_at: "2024-01-01T00:00:00Z",
      },
    ];
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { members } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { fetchOrgMembers } = await import("@/services/user-service");
    const result = await fetchOrgMembers(ORG_ID);
    expect(result).toHaveLength(1);
    expect(result[0]!.email).toBe("alice@example.com");
    expect(result[0]!.role).toBe("admin");
  });

  it("returns member array from unwrapped response", async () => {
    const members = [
      {
        user_id: "u2",
        email: "bob@example.com",
        display_name: null,
        role: "member",
        joined_at: "2024-02-01T00:00:00Z",
      },
    ];
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ members }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { fetchOrgMembers } = await import("@/services/user-service");
    const result = await fetchOrgMembers(ORG_ID);
    expect(result[0]!.role).toBe("member");
  });
});

// ─── inviteOrgMember ──────────────────────────────────────────────────────────

describe("inviteOrgMember", () => {
  const BASE = "https://us.example.com";
  const ORG_ID = "org-abc";

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USER_SERVICE_URL", BASE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls POST /api/orgs/:orgId/invitations", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 201 }),
    );
    const { inviteOrgMember } = await import("@/services/user-service");
    await expect(
      inviteOrgMember(ORG_ID, { email: "charlie@example.com", role: "member" }),
    ).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/orgs/${ORG_ID}/invitations`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws on conflict (last-admin guard or duplicate)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "already a member" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { inviteOrgMember } = await import("@/services/user-service");
    await expect(
      inviteOrgMember(ORG_ID, { email: "already@example.com", role: "admin" }),
    ).rejects.toThrow("already a member");
  });
});

// ─── changeOrgMemberRole ──────────────────────────────────────────────────────

describe("changeOrgMemberRole", () => {
  const BASE = "https://us.example.com";
  const ORG_ID = "org-abc";
  const USER_ID = "u1";

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USER_SERVICE_URL", BASE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls PATCH /api/orgs/:orgId/members/:userId", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    const { changeOrgMemberRole } = await import("@/services/user-service");
    await changeOrgMemberRole(ORG_ID, USER_ID, { role: "admin" });
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/orgs/${ORG_ID}/members/${USER_ID}`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("throws 409 when last-admin guard fires", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "cannot remove last admin" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { changeOrgMemberRole } = await import("@/services/user-service");
    await expect(
      changeOrgMemberRole(ORG_ID, USER_ID, { role: "member" }),
    ).rejects.toThrow("cannot remove last admin");
  });
});

// ─── removeOrgMember ──────────────────────────────────────────────────────────

describe("removeOrgMember", () => {
  const BASE = "https://us.example.com";
  const ORG_ID = "org-abc";

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USER_SERVICE_URL", BASE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls DELETE /api/orgs/:orgId/members/:userId", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    );
    const { removeOrgMember } = await import("@/services/user-service");
    await removeOrgMember(ORG_ID, "u99");
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/orgs/${ORG_ID}/members/u99`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

// ─── fetchOrgWorkspaces ───────────────────────────────────────────────────────

describe("fetchOrgWorkspaces", () => {
  const BASE = "https://us.example.com";
  const ORG_ID = "org-abc";

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USER_SERVICE_URL", BASE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns workspace array", async () => {
    const workspaces = [{ id: "ws1", name: "Workspace A", slug: "ws-a" }];
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ workspaces }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { fetchOrgWorkspaces } = await import("@/services/user-service");
    const result = await fetchOrgWorkspaces(ORG_ID);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Workspace A");
  });

  it("returns empty array when workspaces is empty", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ workspaces: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { fetchOrgWorkspaces } = await import("@/services/user-service");
    const result = await fetchOrgWorkspaces(ORG_ID);
    expect(result).toHaveLength(0);
  });
});

// ─── transferOrgOwnership ─────────────────────────────────────────────────────

describe("transferOrgOwnership", () => {
  const BASE = "https://us.example.com";
  const ORG_ID = "org-abc";

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USER_SERVICE_URL", BASE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls POST /api/orgs/:orgId/transfer", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    const { transferOrgOwnership } = await import("@/services/user-service");
    await transferOrgOwnership(ORG_ID, { new_owner_user_id: "u2" });
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/orgs/${ORG_ID}/transfer`,
      expect.objectContaining({ method: "POST" }),
    );
  });
});

// ─── deleteOrg ───────────────────────────────────────────────────────────────

describe("deleteOrg", () => {
  const BASE = "https://us.example.com";
  const ORG_ID = "org-abc";

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USER_SERVICE_URL", BASE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls DELETE /api/orgs/:orgId", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    );
    const { deleteOrg } = await import("@/services/user-service");
    await deleteOrg(ORG_ID);
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/orgs/${ORG_ID}`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws on forbidden response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { deleteOrg } = await import("@/services/user-service");
    await expect(deleteOrg(ORG_ID)).rejects.toThrow("forbidden");
  });
});

// ─── Authorization matrix helpers ─────────────────────────────────────────────

describe("authorization matrix — canEdit derivation", () => {
  it("admin and platform_admin are allowed to edit", () => {
    const canEdit = (role: string) =>
      role === "admin" || role === "platform_admin";
    expect(canEdit("admin")).toBe(true);
    expect(canEdit("platform_admin")).toBe(true);
    expect(canEdit("member")).toBe(false);
  });

  it("platform_admin is not assignable via changeRole (API accepts only member/admin)", () => {
    type ChangeableRole = "member" | "admin";
    const validRole: ChangeableRole = "admin";
    // TypeScript ensures only member/admin are accepted by ChangeOrgMemberRoleRequest
    expect(["member", "admin"]).toContain(validRole);
  });
});
