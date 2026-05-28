import { describe, it, expect } from "vitest";
import {
  buildFeatureParams,
  buildTaskParams,
  SIDEBAR_TASK_PARAMS,
} from "../services/workflow-backend/query-params";

describe("buildFeatureParams", () => {
  it("returns empty URLSearchParams for empty input", () => {
    const sp = buildFeatureParams({});
    expect(sp.toString()).toBe("");
  });

  it("sets title", () => {
    const sp = buildFeatureParams({ title: "data backend" });
    expect(sp.get("title")).toBe("data backend");
  });

  it("sets status as string", () => {
    const sp = buildFeatureParams({ status: "ready" });
    expect(sp.get("status")).toBe("ready");
  });

  it("joins status array with commas", () => {
    const sp = buildFeatureParams({ status: ["ready", "in_progress", "blocked"] });
    expect(sp.get("status")).toBe("ready,in_progress,blocked");
  });

  it("sets sort, page, and limit", () => {
    const sp = buildFeatureParams({ sort: "title_asc", page: 2, limit: 10 });
    expect(sp.get("sort")).toBe("title_asc");
    expect(sp.get("page")).toBe("2");
    expect(sp.get("limit")).toBe("10");
  });

  it("omits undefined fields", () => {
    const sp = buildFeatureParams({ title: "foo" });
    expect(sp.has("status")).toBe(false);
    expect(sp.has("sort")).toBe(false);
    expect(sp.has("page")).toBe(false);
    expect(sp.has("limit")).toBe(false);
  });
});

describe("buildTaskParams", () => {
  it("returns empty URLSearchParams for empty input", () => {
    const sp = buildTaskParams({});
    expect(sp.toString()).toBe("");
  });

  it("sets task_id (task_name search)", () => {
    const sp = buildTaskParams({ task_id: "T1" });
    expect(sp.get("task_id")).toBe("T1");
  });

  it("sets title", () => {
    const sp = buildTaskParams({ title: "implement" });
    expect(sp.get("title")).toBe("implement");
  });

  it("joins status array with commas", () => {
    const sp = buildTaskParams({ status: ["in_progress", "in_review", "ready"] });
    expect(sp.get("status")).toBe("in_progress,in_review,ready");
  });

  it("sets repo", () => {
    const sp = buildTaskParams({ repo: "workflow-backend" });
    expect(sp.get("repo")).toBe("workflow-backend");
  });

  it("sets sort, page, limit", () => {
    const sp = buildTaskParams({ sort: "task_id_asc", page: 1, limit: 20 });
    expect(sp.get("sort")).toBe("task_id_asc");
    expect(sp.get("page")).toBe("1");
    expect(sp.get("limit")).toBe("20");
  });

  it("omits undefined fields", () => {
    const sp = buildTaskParams({ sort: "task_id_asc" });
    expect(sp.has("task_id")).toBe(false);
    expect(sp.has("title")).toBe(false);
    expect(sp.has("status")).toBe(false);
    expect(sp.has("repo")).toBe(false);
  });
});

describe("SIDEBAR_TASK_PARAMS", () => {
  it("includes blocked, in_progress, in_reviewing, in_review, ready statuses", () => {
    expect(SIDEBAR_TASK_PARAMS.get("status")).toBe("blocked,in_progress,in_reviewing,in_review,ready");
  });

  it("sorts by task_id_asc", () => {
    expect(SIDEBAR_TASK_PARAMS.get("sort")).toBe("task_id_asc");
  });

  it("uses page 1 and limit 50", () => {
    expect(SIDEBAR_TASK_PARAMS.get("page")).toBe("1");
    expect(SIDEBAR_TASK_PARAMS.get("limit")).toBe("50");
  });
});
