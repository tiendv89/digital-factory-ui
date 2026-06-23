import { describe, expect, it } from "vitest";

import type { MeData, UpdateMeRequest } from "@/services/user-service";

describe("MeUser type", () => {
  it("includes username and linked_providers fields", () => {
    const user: MeData["user"] = {
      id: "user-1",
      email: "test@example.com",
      display_name: "Test User",
      username: "test_user",
      avatar_url: null,
      linked_providers: ["google", "github"],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    expect(user.username).toBe("test_user");
    expect(user.linked_providers).toEqual(["google", "github"]);
  });

  it("allows null username", () => {
    const user: MeData["user"] = {
      id: "user-1",
      email: "test@example.com",
      display_name: null,
      username: null,
      avatar_url: null,
      linked_providers: [],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    expect(user.username).toBeNull();
    expect(user.linked_providers).toEqual([]);
  });
});

describe("UpdateMeRequest type", () => {
  it("allows updating username and avatar_url", () => {
    const req: UpdateMeRequest = {
      display_name: "Updated Name",
      username: "new_username",
      avatar_url: "https://example.com/avatar.png",
    };

    expect(req.username).toBe("new_username");
    expect(req.avatar_url).toBe("https://example.com/avatar.png");
  });

  it("allows partial updates with null values", () => {
    const req: UpdateMeRequest = {
      username: null,
    };

    expect(req.username).toBeNull();
    expect(req.display_name).toBeUndefined();
  });
});
