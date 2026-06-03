import { beforeEach, describe, expect, it } from "vitest";
import {
  getStoredPanelSelection,
  savePanelSelection,
} from "../features/board/lib/panel-selection-store";

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

const STORAGE_KEY = "dashboard:board-panel-selection";

beforeEach(() => {
  mockLS.clear();
});

describe("board panel selection storage", () => {
  it("persists selected task tracking detail tabs", () => {
    savePanelSelection("reviewing");

    expect(getStoredPanelSelection()).toBe("reviewing");
  });

  it("persists the board selection to clear a previous detail tab", () => {
    savePanelSelection("ready");
    savePanelSelection("kanban_board");

    expect(getStoredPanelSelection()).toBe("kanban_board");
  });

  it("ignores invalid stored panel values", () => {
    mockLS.setItem(STORAGE_KEY, "todo");

    expect(getStoredPanelSelection()).toBeNull();
  });
});
