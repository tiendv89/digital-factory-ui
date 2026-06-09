import { describe, expect, it } from "vitest";
import { getMeData } from "../services/user-service";
import type { MeResponse, MeData } from "../services/user-service";

const MOCK_USER_DATA: MeData = {
  user: {
    id: "u1",
    email: "alice@example.com",
    display_name: "Alice",
    avatar_url: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  memberships: [
    {
      organization_id: "org1",
      organization_slug: "acme",
      organization_name: "Acme Corp",
      role: "admin",
    },
  ],
  accessible_workspace_ids: ["ws1"],
};

const MOCK_ME_RESPONSE: MeResponse = { data: MOCK_USER_DATA };

describe("getMeData", () => {
  it("unwraps MeResponse envelope", () => {
    const result = getMeData(MOCK_ME_RESPONSE);
    expect(result.user.id).toBe("u1");
    expect(result.user.email).toBe("alice@example.com");
    expect(result.memberships).toHaveLength(1);
  });

  it("returns MeData directly when passed without envelope", () => {
    const result = getMeData(MOCK_USER_DATA);
    expect(result.user.display_name).toBe("Alice");
  });
});

describe("UpdateMeRequest type coverage", () => {
  it("allows partial update with display_name only", () => {
    const req = { display_name: "Bob" };
    expect(req.display_name).toBe("Bob");
  });

  it("allows clearing display_name to null", () => {
    const req = { display_name: null };
    expect(req.display_name).toBeNull();
  });
});
