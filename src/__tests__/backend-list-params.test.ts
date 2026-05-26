import { describe, it, expect } from "vitest";
import {
  shouldResetPage,
  makeDefaultBoardListParams,
  buildBoardFeatureParams,
  buildBoardTaskParams,
  BOARD_DEFAULT_LIMIT,
  BOARD_DEFAULT_SORT,
} from "../features/board/lib/backend-list-params";

describe("makeDefaultBoardListParams", () => {
  it("returns page 1 with default limit and sort", () => {
    const params = makeDefaultBoardListParams();
    expect(params.page).toBe(1);
    expect(params.limit).toBe(BOARD_DEFAULT_LIMIT);
    expect(params.sort).toBe(BOARD_DEFAULT_SORT);
  });
});

describe("shouldResetPage", () => {
  const base = makeDefaultBoardListParams();

  it("returns true when title changes", () => {
    expect(shouldResetPage({ ...base, title: "old" }, { ...base, title: "new" })).toBe(true);
  });

  it("returns true when title added (was undefined)", () => {
    expect(shouldResetPage({ ...base, title: undefined }, { ...base, title: "new" })).toBe(true);
  });

  it("returns true when title cleared", () => {
    expect(shouldResetPage({ ...base, title: "old" }, { ...base, title: undefined })).toBe(true);
  });

  it("returns true when status changes", () => {
    expect(shouldResetPage({ ...base, status: "ready" }, { ...base, status: "in_progress" })).toBe(
      true,
    );
  });

  it("returns true when status array changes", () => {
    expect(
      shouldResetPage(
        { ...base, status: ["ready", "in_progress"] },
        { ...base, status: ["ready"] },
      ),
    ).toBe(true);
  });

  it("returns true when sort changes", () => {
    expect(
      shouldResetPage({ ...base, sort: "title_asc" }, { ...base, sort: "updated_at_desc" }),
    ).toBe(true);
  });

  it("returns false when only page changes", () => {
    expect(shouldResetPage({ ...base, page: 1 }, { ...base, page: 5 })).toBe(false);
  });

  it("returns false when only limit changes", () => {
    expect(
      shouldResetPage({ ...base, page: 1, limit: 50 }, { ...base, page: 1, limit: 100 }),
    ).toBe(false);
  });

  it("returns false when nothing changes", () => {
    expect(shouldResetPage(base, { ...base })).toBe(false);
  });
});

describe("buildBoardFeatureParams", () => {
  it("includes title, status, page, limit, sort", () => {
    const params = buildBoardFeatureParams({
      title: "data",
      status: ["ready"],
      page: 2,
      limit: 20,
      sort: "title_asc",
    });
    expect(params.title).toBe("data");
    expect(params.status).toEqual(["ready"]);
    expect(params.page).toBe(2);
    expect(params.limit).toBe(20);
    expect(params.sort).toBe("title_asc");
  });

  it("uses default sort when not provided", () => {
    const params = buildBoardFeatureParams({
      page: 1,
      limit: 100,
    });
    expect(params.sort).toBe(BOARD_DEFAULT_SORT);
  });

  it("lets explicit sort override default", () => {
    const params = buildBoardFeatureParams({
      page: 1,
      limit: 100,
      sort: "title_asc",
    });
    expect(params.sort).toBe("title_asc");
  });
});

describe("buildBoardTaskParams", () => {
  it("includes title, status, page, limit, sort", () => {
    const params = buildBoardTaskParams({
      title: "implement",
      status: "in_progress",
      page: 1,
      limit: 50,
      sort: "task_id_asc",
    });
    expect(params.title).toBe("implement");
    expect(params.status).toBe("in_progress");
    expect(params.page).toBe(1);
    expect(params.limit).toBe(50);
    expect(params.sort).toBe("task_id_asc");
  });

  it("uses default sort when not provided", () => {
    const params = buildBoardTaskParams({
      page: 1,
      limit: 100,
    });
    expect(params.sort).toBe(BOARD_DEFAULT_SORT);
  });
});
