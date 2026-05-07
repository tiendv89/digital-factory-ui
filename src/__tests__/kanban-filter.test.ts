import { describe, it, expect } from "vitest";
import {
  matchesSearch,
  matchesStatusFilter,
} from "../features/board/lib/filter";
import type { ParsedFeature } from "../services/yaml-parser";

function makeFeature(overrides: Partial<ParsedFeature> = {}): ParsedFeature {
  return {
    id: "test-feature",
    title: "Test Feature",
    featureStatus: "in_implementation",
    tasks: [],
    ...overrides,
  };
}

function makeTask(
  id: string,
  title: string,
  status: string,
): ParsedFeature["tasks"][number] {
  return { id, title, status, dependsOn: [] };
}

describe("matchesSearch", () => {
  it("returns true when query is empty", () => {
    const feature = makeFeature();
    expect(matchesSearch(feature, "")).toBe(true);
  });

  it("matches on feature title (case-insensitive)", () => {
    const feature = makeFeature({ title: "Authentication System" });
    expect(matchesSearch(feature, "auth")).toBe(true);
    expect(matchesSearch(feature, "AUTH")).toBe(true);
    expect(matchesSearch(feature, "payment")).toBe(false);
  });

  it("matches on feature id", () => {
    const feature = makeFeature({ id: "dashboard-feature" });
    expect(matchesSearch(feature, "dashboard")).toBe(true);
    expect(matchesSearch(feature, "xyz")).toBe(false);
  });

  it("matches on task title", () => {
    const feature = makeFeature({
      tasks: [makeTask("T1", "Setup OAuth providers", "todo")],
    });
    expect(matchesSearch(feature, "oauth")).toBe(true);
    expect(matchesSearch(feature, "payment")).toBe(false);
  });

  it("matches on task id", () => {
    const feature = makeFeature({
      tasks: [makeTask("T7", "Some task", "ready")],
    });
    expect(matchesSearch(feature, "T7")).toBe(true);
    expect(matchesSearch(feature, "T3")).toBe(false);
  });

  it("returns false when no field matches", () => {
    const feature = makeFeature({
      id: "alpha",
      title: "Alpha Feature",
      tasks: [makeTask("T1", "First task", "todo")],
    });
    expect(matchesSearch(feature, "completely-unrelated-xyz")).toBe(false);
  });
});

describe("matchesStatusFilter", () => {
  it("returns true when status filter is empty", () => {
    const feature = makeFeature({
      tasks: [makeTask("T1", "Task one", "done")],
    });
    expect(matchesStatusFilter(feature, [])).toBe(true);
  });

  it("returns true when feature has a task matching any filter status", () => {
    const feature = makeFeature({
      tasks: [
        makeTask("T1", "Task one", "done"),
        makeTask("T2", "Task two", "in_progress"),
      ],
    });
    expect(matchesStatusFilter(feature, ["in_progress"])).toBe(true);
    expect(matchesStatusFilter(feature, ["done", "cancelled"])).toBe(true);
  });

  it("returns false when no task matches any filter status", () => {
    const feature = makeFeature({
      tasks: [
        makeTask("T1", "Task one", "done"),
        makeTask("T2", "Task two", "done"),
      ],
    });
    expect(matchesStatusFilter(feature, ["in_progress", "ready"])).toBe(false);
  });

  it("returns false for a feature with no tasks when statuses are specified", () => {
    const feature = makeFeature({ tasks: [] });
    expect(matchesStatusFilter(feature, ["ready"])).toBe(false);
  });
});
