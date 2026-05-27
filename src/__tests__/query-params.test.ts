import { describe, it, expect } from "vitest";
import {
  buildFeatureParams,
  buildTaskParams,
  SIDEBAR_TASK_PARAMS,
} from "../services/workflow-backend/query-params";

describe("buildFeatureParams", () => {
  it("produces empty URLSearchParams when no fields are set", () => {
    const sp = buildFeatureParams({});
    expect(sp.toString()).toBe("");
  });

  it("maps title to 'title' query param", () => {
    const sp = buildFeatureParams({ title: "auth" });
    expect(sp.get("title")).toBe("auth");
  });

  it("serializes string status directly", () => {
    const sp = buildFeatureParams({ status: "in_design" });
    expect(sp.get("status")).toBe("in_design");
  });

  it("serializes array status as comma-separated", () => {
    const sp = buildFeatureParams({ status: ["in_design", "in_implementation"] });
    expect(sp.get("status")).toBe("in_design,in_implementation");
  });

  it("maps sort, page, limit correctly", () => {
    const sp = buildFeatureParams({ sort: "title_asc", page: 2, limit: 10 });
    expect(sp.get("sort")).toBe("title_asc");
    expect(sp.get("page")).toBe("2");
    expect(sp.get("limit")).toBe("10");
  });

  it("omits undefined fields", () => {
    const sp = buildFeatureParams({ title: "test" });
    expect(sp.has("status")).toBe(false);
    expect(sp.has("page")).toBe(false);
  });
});

describe("buildTaskParams", () => {
  it("produces empty URLSearchParams when no fields are set", () => {
    const sp = buildTaskParams({});
    expect(sp.toString()).toBe("");
  });

  it("maps task_id to 'task_id' query param for task name search", () => {
    const sp = buildTaskParams({ task_id: "T1" });
    expect(sp.get("task_id")).toBe("T1");
  });

  it("maps title to 'title' query param for task title search", () => {
    const sp = buildTaskParams({ title: "frontend" });
    expect(sp.get("title")).toBe("frontend");
  });

  it("serializes status array as comma-separated", () => {
    const sp = buildTaskParams({
      status: ["in_progress", "in_review", "ready"],
    });
    expect(sp.get("status")).toBe("in_progress,in_review,ready");
  });

  it("maps repo filter", () => {
    const sp = buildTaskParams({ repo: "digital-factory-ui" });
    expect(sp.get("repo")).toBe("digital-factory-ui");
  });

  it("maps sort, page, limit correctly", () => {
    const sp = buildTaskParams({ sort: "task_id_asc", page: 1, limit: 20 });
    expect(sp.get("sort")).toBe("task_id_asc");
    expect(sp.get("page")).toBe("1");
    expect(sp.get("limit")).toBe("20");
  });

  it("omits undefined fields", () => {
    const sp = buildTaskParams({ task_id: "T2" });
    expect(sp.has("title")).toBe(false);
    expect(sp.has("status")).toBe(false);
    expect(sp.has("repo")).toBe(false);
  });
});

describe("SIDEBAR_TASK_PARAMS", () => {
  it("sets status to 'blocked,in_progress,in_reviewing,in_review,ready'", () => {
    expect(SIDEBAR_TASK_PARAMS.get("status")).toBe("blocked,in_progress,in_reviewing,in_review,ready");
  });

  it("sets sort to 'task_id_asc'", () => {
    expect(SIDEBAR_TASK_PARAMS.get("sort")).toBe("task_id_asc");
  });

  it("sets page to '1'", () => {
    expect(SIDEBAR_TASK_PARAMS.get("page")).toBe("1");
  });

  it("sets limit to '50'", () => {
    expect(SIDEBAR_TASK_PARAMS.get("limit")).toBe("50");
  });

  it("does not include task_id or title or repo filters", () => {
    expect(SIDEBAR_TASK_PARAMS.has("task_id")).toBe(false);
    expect(SIDEBAR_TASK_PARAMS.has("title")).toBe(false);
    expect(SIDEBAR_TASK_PARAMS.has("repo")).toBe(false);
  });
});
