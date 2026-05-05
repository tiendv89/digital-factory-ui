import { describe, it, expect } from "vitest";
import { parseRepoInput } from "../features/workspaces/lib/parseRepoInput";
describe("parseRepoInput", () => {
  it("parses owner/repo", () => { expect(parseRepoInput("tiendv89/project-workspace")).toEqual({ owner: "tiendv89", repo: "project-workspace" }); });
  it("parses https URL", () => { expect(parseRepoInput("https://github.com/tiendv89/project-workspace")).toEqual({ owner: "tiendv89", repo: "project-workspace" }); });
  it("parses https URL with trailing slash", () => { expect(parseRepoInput("https://github.com/tiendv89/project-workspace/")).toEqual({ owner: "tiendv89", repo: "project-workspace" }); });
  it("parses https URL with .git", () => { expect(parseRepoInput("https://github.com/tiendv89/project-workspace.git")).toEqual({ owner: "tiendv89", repo: "project-workspace" }); });
  it("parses SSH git@ format", () => { expect(parseRepoInput("git@github.com:tiendv89/project-workspace.git")).toEqual({ owner: "tiendv89", repo: "project-workspace" }); });
  it("parses SSH without .git", () => { expect(parseRepoInput("git@github.com:tiendv89/project-workspace")).toEqual({ owner: "tiendv89", repo: "project-workspace" }); });
  it("trims whitespace", () => { expect(parseRepoInput("  tiendv89/project-workspace  ")).toEqual({ owner: "tiendv89", repo: "project-workspace" }); });
  it("null for empty", () => { expect(parseRepoInput("")).toBeNull(); expect(parseRepoInput("   ")).toBeNull(); });
  it("null for no slash", () => { expect(parseRepoInput("justarepo")).toBeNull(); });
  it("null for multiple segments", () => { expect(parseRepoInput("owner/repo/extra")).toBeNull(); });
  it("null for non-GitHub URL", () => { expect(parseRepoInput("https://gitlab.com/owner/repo")).toBeNull(); });
  it("null for bare GitHub URL", () => { expect(parseRepoInput("https://github.com/owner")).toBeNull(); });
});
