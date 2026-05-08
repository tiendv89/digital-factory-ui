import { beforeEach, describe, expect, it } from "vitest";
import {
  getDefaultStatusFilter,
  getStoredStatusFilter,
  saveStatusFilter,
} from "../features/board/lib/status-filter-store";
import { STATUS_COLUMNS } from "../features/board/lib/status";

const store: Record<string, string> = {};
const mockLS = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((key) => {
      delete store[key];
    });
  },
};

// @ts-expect-error test storage shim
global.window = {};
// @ts-expect-error test storage shim
global.localStorage = mockLS;

const STORAGE_KEY = "dashboard:board-status-filter";

beforeEach(() => {
  mockLS.clear();
});

describe("getDefaultStatusFilter", () => {
  it("returns all statuses except done", () => {
    const defaults = getDefaultStatusFilter();
    expect(defaults).not.toContain("done");
    const allExceptDone = STATUS_COLUMNS.filter((s) => s.key !== "done").map(
      (s) => s.key,
    );
    expect(defaults).toEqual(allExceptDone);
  });

  it("includes todo, ready, in_progress, blocked, in_review, cancelled", () => {
    const defaults = getDefaultStatusFilter();
    expect(defaults).toContain("todo");
    expect(defaults).toContain("ready");
    expect(defaults).toContain("in_progress");
    expect(defaults).toContain("blocked");
    expect(defaults).toContain("in_review");
    expect(defaults).toContain("cancelled");
  });
});

describe("getStoredStatusFilter", () => {
  it("returns null when nothing is stored", () => {
    expect(getStoredStatusFilter()).toBeNull();
  });

  it("restores a previously saved filter", () => {
    saveStatusFilter(["todo", "ready"]);
    expect(getStoredStatusFilter()).toEqual(["todo", "ready"]);
  });

  it("returns null for invalid stored data", () => {
    mockLS.setItem(STORAGE_KEY, JSON.stringify(["invalid_status"]));
    expect(getStoredStatusFilter()).toBeNull();
  });

  it("returns null for non-array stored data", () => {
    mockLS.setItem(STORAGE_KEY, JSON.stringify({ statuses: ["todo"] }));
    expect(getStoredStatusFilter()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    mockLS.setItem(STORAGE_KEY, "not-json");
    expect(getStoredStatusFilter()).toBeNull();
  });
});

describe("saveStatusFilter", () => {
  it("persists a full filter selection", () => {
    saveStatusFilter(["in_progress", "in_review"]);
    const raw = mockLS.getItem(STORAGE_KEY);
    expect(JSON.parse(raw!)).toEqual(["in_progress", "in_review"]);
  });

  it("persists an empty filter", () => {
    saveStatusFilter([]);
    expect(getStoredStatusFilter()).toEqual([]);
  });

  it("overwrites a previous save", () => {
    saveStatusFilter(["todo"]);
    saveStatusFilter(["done", "cancelled"]);
    expect(getStoredStatusFilter()).toEqual(["done", "cancelled"]);
  });
});
