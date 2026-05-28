import { describe, it, expect } from "vitest";
import { workspaceKeys } from "../lib/query-keys";

const WS = "ws-abc";

describe("workspaceKeys.detail", () => {
  it("includes workspace ID", () => {
    const key = workspaceKeys.detail(WS);
    expect(key).toContain(WS);
    expect(key[0]).toBe("workspace");
    expect(key[1]).toBe(WS);
    expect(key[2]).toBe("detail");
  });

  it("differs for different workspace IDs", () => {
    expect(workspaceKeys.detail("ws-1")).not.toEqual(workspaceKeys.detail("ws-2"));
  });
});

describe("workspaceKeys.sidebarTasks", () => {
  it("includes workspace ID and sidebar-tasks segment", () => {
    const key = workspaceKeys.sidebarTasks(WS);
    expect(key[0]).toBe("workspace");
    expect(key[1]).toBe(WS);
    expect(key[2]).toBe("sidebar-tasks");
  });

  it("differs for different workspace IDs", () => {
    expect(workspaceKeys.sidebarTasks("ws-1")).not.toEqual(
      workspaceKeys.sidebarTasks("ws-2"),
    );
  });

  it("includes serialized URLSearchParams when provided", () => {
    const params = new URLSearchParams({ status: "blocked", sort: "asc" });
    const key = workspaceKeys.sidebarTasks(WS, params);
    expect(key[3]).toBe(params.toString());
  });
});

describe("workspaceKeys.tasks", () => {
  it("includes workspace ID and normalized params", () => {
    const key = workspaceKeys.tasks(WS, { status: "in_progress", page: 1 });
    expect(key[0]).toBe("workspace");
    expect(key[1]).toBe(WS);
    expect(key[2]).toBe("tasks");
    const norm = key[3] as Record<string, unknown>;
    expect(norm.status).toBe("in_progress");
    expect(norm.page).toBe(1);
  });

  it("reuses same key for equivalent params", () => {
    const a = workspaceKeys.tasks(WS, { title: "foo", status: "done" });
    const b = workspaceKeys.tasks(WS, { title: "foo", status: "done" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("sorts multi-value status arrays for stable keys", () => {
    const a = workspaceKeys.tasks(WS, { status: ["blocked", "in_progress"] });
    const b = workspaceKeys.tasks(WS, { status: ["in_progress", "blocked"] });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("produces different keys for different workspace IDs", () => {
    const params = { status: "ready" };
    expect(JSON.stringify(workspaceKeys.tasks("ws-1", params))).not.toBe(
      JSON.stringify(workspaceKeys.tasks("ws-2", params)),
    );
  });

  it("omits undefined params from the key", () => {
    const key = workspaceKeys.tasks(WS, { page: 2 });
    const norm = key[3] as Record<string, unknown>;
    expect("title" in norm).toBe(false);
    expect("status" in norm).toBe(false);
    expect(norm.page).toBe(2);
  });
});

describe("workspaceKeys.features", () => {
  it("includes workspace ID and normalized feature params", () => {
    const key = workspaceKeys.features(WS, { title: "my-feature" });
    expect(key[0]).toBe("workspace");
    expect(key[1]).toBe(WS);
    expect(key[2]).toBe("features");
    const norm = key[3] as Record<string, unknown>;
    expect(norm.title).toBe("my-feature");
  });

  it("sorts multi-value status for feature params", () => {
    const a = workspaceKeys.features(WS, { status: ["done", "in_design"] });
    const b = workspaceKeys.features(WS, { status: ["in_design", "done"] });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("differs across workspace IDs", () => {
    expect(JSON.stringify(workspaceKeys.features("ws-1", {}))).not.toBe(
      JSON.stringify(workspaceKeys.features("ws-2", {})),
    );
  });
});

describe("workspaceKeys.task", () => {
  it("includes workspace ID and task ID", () => {
    const key = workspaceKeys.task(WS, "T42");
    expect(key[0]).toBe("workspace");
    expect(key[1]).toBe(WS);
    expect(key[2]).toBe("task");
    expect(key[3]).toBe("T42");
  });

  it("differs for different task IDs", () => {
    expect(workspaceKeys.task(WS, "T1")).not.toEqual(workspaceKeys.task(WS, "T2"));
  });
});

describe("workspaceKeys.feature", () => {
  it("includes workspace ID and feature ID", () => {
    const key = workspaceKeys.feature(WS, "my-feature");
    expect(key[0]).toBe("workspace");
    expect(key[1]).toBe(WS);
    expect(key[2]).toBe("feature");
    expect(key[3]).toBe("my-feature");
  });
});

describe("workspaceKeys.featureTask", () => {
  it("includes workspace ID, feature ID, and task ID", () => {
    const key = workspaceKeys.featureTask(WS, "my-feature", "T5");
    expect(key[0]).toBe("workspace");
    expect(key[1]).toBe(WS);
    expect(key[2]).toBe("feature");
    expect(key[3]).toBe("my-feature");
    expect(key[4]).toBe("task");
    expect(key[5]).toBe("T5");
  });

  it("differs when feature or task ID changes", () => {
    expect(workspaceKeys.featureTask(WS, "f1", "T1")).not.toEqual(
      workspaceKeys.featureTask(WS, "f2", "T1"),
    );
    expect(workspaceKeys.featureTask(WS, "f1", "T1")).not.toEqual(
      workspaceKeys.featureTask(WS, "f1", "T2"),
    );
  });
});

describe("workspaceKeys.all", () => {
  it("returns workspace-scoped prefix for invalidation", () => {
    const key = workspaceKeys.all(WS);
    expect(key[0]).toBe("workspace");
    expect(key[1]).toBe(WS);
  });
});
