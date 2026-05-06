import { describe, it, expect, beforeEach } from "vitest";
const store: Record<string, string> = {};
const mockLS = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => { delete store[k]; }); },
};
// @ts-expect-error global patch
global.window = {};
// @ts-expect-error global patch
global.localStorage = mockLS;
import { getWorkspace, saveWorkspace, clearWorkspace } from "../services/workspace-store";
import type { StoredWorkspace } from "../types/workspace";
const KEY = "dashboard:workspace";
const sample: StoredWorkspace = { id: "abc", owner: "tiendv89", repo: "project-workspace", name: "project-workspace", isPrivate: false, connectedAt: "2026-01-01T00:00:00.000Z" };
beforeEach(() => { mockLS.clear(); });
describe("getWorkspace", () => {
  it("returns null when empty", () => { expect(getWorkspace()).toBeNull(); });
  it("returns parsed workspace after save", () => { mockLS.setItem(KEY, JSON.stringify(sample)); expect(getWorkspace()).toEqual(sample); });
  it("returns null for invalid JSON", () => { mockLS.setItem(KEY, "bad{{{"); expect(getWorkspace()).toBeNull(); });
});
describe("saveWorkspace", () => {
  it("persists workspace", () => { saveWorkspace(sample); expect(JSON.parse(mockLS.getItem(KEY)!)).toEqual(sample); });
  it("overwrites previous", () => { saveWorkspace(sample); saveWorkspace({ ...sample, repo: "other" }); expect(getWorkspace()?.repo).toBe("other"); });
  it("stores PAT", () => { saveWorkspace({ ...sample, isPrivate: true, pat: "ghp_x" }); expect(getWorkspace()?.pat).toBe("ghp_x"); });
});
describe("clearWorkspace", () => {
  it("removes workspace", () => { saveWorkspace(sample); clearWorkspace(); expect(getWorkspace()).toBeNull(); });
});
