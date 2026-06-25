import { describe, expect, it } from "vitest";

import type { MeData } from "@/services/user-service";
import { hasPlatformRole, isPlatformAdmin } from "@/utils/platform-role";

function makeMe(platform_roles: string[]): MeData {
  return {
    user: {
      id: "u1",
      email: "test@example.com",
      display_name: null,
      username: null,
      avatar_url: null,
      linked_providers: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    memberships: [],
    org_workspace_ids: {},
    platform_roles,
  };
}

describe("hasPlatformRole", () => {
  it("returns true when the role is present", () => {
    expect(hasPlatformRole(makeMe(["platform_admin"]), "platform_admin")).toBe(true);
  });

  it("returns false when the role is absent", () => {
    expect(hasPlatformRole(makeMe(["other_role"]), "platform_admin")).toBe(false);
    expect(hasPlatformRole(makeMe([]), "platform_admin")).toBe(false);
  });

  it("returns false for null meData", () => {
    expect(hasPlatformRole(null, "platform_admin")).toBe(false);
  });

  it("returns false for undefined meData", () => {
    expect(hasPlatformRole(undefined, "platform_admin")).toBe(false);
  });

  it("handles meData with undefined platform_roles gracefully", () => {
    const me = makeMe([]);
    // Simulate the old shape where platform_roles might be absent
    const oldMe = { ...me, platform_roles: undefined } as unknown as MeData;
    expect(hasPlatformRole(oldMe, "platform_admin")).toBe(false);
  });
});

describe("isPlatformAdmin", () => {
  it("returns true for a user with platform_admin role", () => {
    expect(isPlatformAdmin(makeMe(["platform_admin"]))).toBe(true);
  });

  it("returns true when platform_admin is among multiple roles", () => {
    expect(isPlatformAdmin(makeMe(["platform_admin", "billing_ops"]))).toBe(true);
  });

  it("returns false for an org-admin user without platform_admin", () => {
    // An org-scoped admin (memberships.role='admin') does NOT imply platform_admin
    const orgAdmin = makeMe([]);
    orgAdmin.memberships = [
      {
        organization_id: "org1",
        organization_slug: "org1",
        organization_name: "Org 1",
        role: "admin",
        member_count: 5,
        workspace_count: 1,
      },
    ];
    expect(isPlatformAdmin(orgAdmin)).toBe(false);
  });

  it("returns false for an empty roles list", () => {
    expect(isPlatformAdmin(makeMe([]))).toBe(false);
  });

  it("returns false for null", () => {
    expect(isPlatformAdmin(null)).toBe(false);
  });
});

describe("MeData platform_roles field", () => {
  it("accepts an array of strings", () => {
    const me: MeData = makeMe(["platform_admin", "billing_ops"]);
    expect(me.platform_roles).toHaveLength(2);
    expect(me.platform_roles).toContain("platform_admin");
  });

  it("accepts an empty array", () => {
    const me: MeData = makeMe([]);
    expect(me.platform_roles).toEqual([]);
  });
});
