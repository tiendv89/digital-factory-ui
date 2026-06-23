import { describe, expect, it } from "vitest";

import { validateUsername } from "@/hooks/settings/use-profile-settings";

describe("validateUsername", () => {
  it("accepts a valid username", () => {
    expect(validateUsername("kite_pye")).toBeNull();
    expect(validateUsername("abc")).toBeNull();
    expect(validateUsername("user-123")).toBeNull();
    expect(validateUsername("a1b")).toBeNull();
  });

  it("rejects username shorter than 3 characters", () => {
    expect(validateUsername("ab")).toMatch(/at least 3/);
    expect(validateUsername("a")).toMatch(/at least 3/);
    expect(validateUsername("")).toMatch(/at least 3/);
  });

  it("rejects username longer than 30 characters", () => {
    const long = "a".repeat(31);
    expect(validateUsername(long)).toMatch(/at most 30/);
  });

  it("rejects usernames with uppercase characters", () => {
    expect(validateUsername("BadUser")).not.toBeNull();
  });

  it("rejects usernames with spaces", () => {
    expect(validateUsername("bad user")).not.toBeNull();
  });

  it("rejects usernames with special characters beyond _ and -", () => {
    expect(validateUsername("bad@user")).not.toBeNull();
    expect(validateUsername("bad.user")).not.toBeNull();
    expect(validateUsername("bad!user")).not.toBeNull();
  });

  it("rejects usernames starting or ending with _ or -", () => {
    expect(validateUsername("_badstart")).not.toBeNull();
    expect(validateUsername("badend_")).not.toBeNull();
    expect(validateUsername("-badstart")).not.toBeNull();
    expect(validateUsername("badend-")).not.toBeNull();
  });

  it("accepts exactly 30 characters", () => {
    const valid = "a" + "b".repeat(28) + "c";
    expect(valid.length).toBe(30);
    expect(validateUsername(valid)).toBeNull();
  });

  it("accepts usernames with underscores and hyphens in the middle", () => {
    expect(validateUsername("foo_bar")).toBeNull();
    expect(validateUsername("foo-bar")).toBeNull();
    expect(validateUsername("foo_bar-baz")).toBeNull();
  });
});
