import { describe, expect, it } from "vitest";

import { getInitPRBadgeState } from "@/components/features/feature-ide-docs-panel";

describe("getInitPRBadgeState", () => {
  it("returns 'none' when init_pr_url is undefined", () => {
    expect(getInitPRBadgeState(undefined, false)).toBe("none");
  });

  it("returns 'none' when init_pr_url is null", () => {
    expect(getInitPRBadgeState(null, false)).toBe("none");
  });

  it("returns 'none' when init_pr_url is empty string", () => {
    expect(getInitPRBadgeState("", false)).toBe("none");
  });

  it("returns 'in_pr' when init_pr_url is set and init_pr_merged is false", () => {
    expect(getInitPRBadgeState("https://github.com/org/repo/pull/1", false)).toBe("in_pr");
  });

  it("returns 'verified' when init_pr_url is set and init_pr_merged is true", () => {
    expect(getInitPRBadgeState("https://github.com/org/repo/pull/1", true)).toBe("verified");
  });

  it("returns 'none' when init_pr_url is null even if init_pr_merged is true", () => {
    expect(getInitPRBadgeState(null, true)).toBe("none");
  });
});
