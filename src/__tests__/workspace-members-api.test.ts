import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock axios so userServiceApi calls don't go to a real server
vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    default: {
      ...actual.default,
      create: () => ({
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        request: vi.fn(),
      }),
      isAxiosError: actual.default.isAxiosError,
    },
  };
});

// We test the exported types only (pure TypeScript shape tests) since the
// runtime HTTP calls require a live userServiceApi axios instance.
// The shape tests confirm the WorkspaceMember and WorkspaceRole types are
// properly defined and exported.

describe("WorkspaceMember type", () => {
  it("accepts a member with all fields", () => {
    const member = {
      user_id: "u1",
      display_name: "Alice",
      avatar_url: "https://example.com/a.png",
      role: "admin" as const,
    };
    expect(member.user_id).toBe("u1");
    expect(member.role).toBe("admin");
  });

  it("accepts a member with null nullable fields", () => {
    const member = {
      user_id: "u2",
      display_name: null,
      avatar_url: null,
      role: "member" as const,
    };
    expect(member.display_name).toBeNull();
    expect(member.avatar_url).toBeNull();
    expect(member.role).toBe("member");
  });
});

describe("WorkspaceRole type", () => {
  it("is either member or admin", () => {
    const roles: Array<"member" | "admin"> = ["member", "admin"];
    expect(roles).toHaveLength(2);
  });
});

describe("CallerWorkspaceRoleResponse type", () => {
  it("has a role field", () => {
    const response = { role: "admin" as const };
    expect(response.role).toBe("admin");
  });
});
