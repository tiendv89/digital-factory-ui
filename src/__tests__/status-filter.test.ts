import { describe, expect, it } from "vitest";
import { STATUS_COLUMNS } from "../features/board/lib/status";
import {
  isAllStatusFilterSelected,
  toggleAllStatusFilter,
  toggleStatusFilter,
} from "../features/board/lib/status-filter";

const ALL_STATUSES = STATUS_COLUMNS.map((status) => status.key);

describe("status filter helpers", () => {
  it("selects every status when All is toggled from an empty filter", () => {
    expect(toggleAllStatusFilter([])).toEqual(ALL_STATUSES);
  });

  it("selects every status when All is toggled from a partial filter", () => {
    expect(toggleAllStatusFilter(["todo", "ready"])).toEqual(ALL_STATUSES);
  });

  it("clears the filter when All is toggled while every status is selected", () => {
    expect(toggleAllStatusFilter(ALL_STATUSES)).toEqual([]);
  });

  it("detects whether every status is selected", () => {
    expect(isAllStatusFilterSelected(ALL_STATUSES)).toBe(true);
    expect(isAllStatusFilterSelected(["todo", "ready"])).toBe(false);
  });

  it("adds and removes individual statuses without changing unrelated selections", () => {
    expect(toggleStatusFilter(["todo"], "ready")).toEqual(["todo", "ready"]);
    expect(toggleStatusFilter(["todo", "ready"], "todo")).toEqual(["ready"]);
  });
});
