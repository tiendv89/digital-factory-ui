import { describe, expect, it, beforeEach } from "vitest";
import {
  getDefaultViewMode,
  getStoredViewMode,
  saveViewMode,
} from "../features/board/lib/status-filter-store";

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

const STORAGE_KEY = "dashboard:board-view-mode";

describe("ViewMode store", () => {
  beforeEach(() => {
    mockLS.clear();
  });

  it("defaults to kanban", () => {
    expect(getDefaultViewMode()).toBe("kanban");
  });

  it("returns null when nothing is stored", () => {
    expect(getStoredViewMode()).toBeNull();
  });

  it("stores and retrieves kanban mode", () => {
    saveViewMode("kanban");
    expect(getStoredViewMode()).toBe("kanban");
  });

  it("stores and retrieves list mode", () => {
    saveViewMode("list");
    expect(getStoredViewMode()).toBe("list");
  });

  it("returns null for invalid stored value", () => {
    mockLS.setItem(STORAGE_KEY, JSON.stringify("invalid-mode"));
    expect(getStoredViewMode()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    mockLS.setItem(STORAGE_KEY, "{not-json");
    expect(getStoredViewMode()).toBeNull();
  });
});
