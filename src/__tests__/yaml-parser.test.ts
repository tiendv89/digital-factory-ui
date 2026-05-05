import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseFeatureStatus,
  parseTaskYaml,
  type ParsedTask,
  type ParsedFeature,
  type LogEntry,
} from "../services/yaml-parser";

describe("parseFeatureStatus", () => {
  it("parses valid feature status YAML", () => {
    const raw = `
feature_id: dashboard
title: Workflow Dashboard
feature_status: ready_for_implementation
stage: tasks/approved
`;
    const result = parseFeatureStatus(raw);
    expect(result.feature_id).toBe("dashboard");
    expect(result.title).toBe("Workflow Dashboard");
    expect(result.feature_status).toBe("ready_for_implementation");
  });

  it("returns empty object for empty YAML", () => {
    const result = parseFeatureStatus("");
    expect(result).toEqual({});
  });

  it("handles minimal YAML with only some fields", () => {
    const raw = `feature_status: in_design`;
    const result = parseFeatureStatus(raw);
    expect(result.feature_status).toBe("in_design");
    expect(result.title).toBeUndefined();
  });
});

describe("parseTaskYaml", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses a complete task YAML", () => {
    const raw = `
id: T2
title: GitHub Contents API client and YAML parser
status: ready
depends_on: []
branch: feature/dashboard-T2
execution:
  actor_type: agent
pr:
  url: null
  status: null
blocked_reason: null
log:
  - action: created
    by: user@example.com
    at: "2026-05-01T10:00:00+0700"
    note: Created from tech lead.
  - action: ready
    by: system@example.com
    at: "2026-05-02T08:00:00Z"
`;
    const task = parseTaskYaml("T2", raw);
    expect(task).not.toBeNull();
    expect(task!.id).toBe("T2");
    expect(task!.title).toBe("GitHub Contents API client and YAML parser");
    expect(task!.status).toBe("ready");
    expect(task!.dependsOn).toEqual([]);
    expect(task!.branch).toBe("feature/dashboard-T2");
    expect(task!.execution?.actor_type).toBe("agent");
    expect(task!.log).toHaveLength(2);
    expect(task!.log![0].action).toBe("created");
    expect(task!.log![0].note).toBe("Created from tech lead.");
    expect(task!.log![1].note).toBeUndefined();
  });

  it("parses task with depends_on list", () => {
    const raw = `
id: T3
title: Board data loading hook
status: todo
depends_on:
  - T1
  - T2
`;
    const task = parseTaskYaml("T3", raw);
    expect(task).not.toBeNull();
    expect(task!.dependsOn).toEqual(["T1", "T2"]);
  });

  it("returns null and warns for malformed YAML", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const raw = `
id: T1
  bad: [indented
  yaml: {broken
`;
    const task = parseTaskYaml("T1", raw);
    expect(task).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("T1"),
      expect.anything(),
    );
  });

  it("returns null and warns for non-object YAML (e.g. plain string)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const task = parseTaskYaml("T1", "just a string");
    expect(task).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("handles missing optional fields gracefully", () => {
    const raw = `
id: T4
status: todo
depends_on: []
`;
    const task = parseTaskYaml("T4", raw);
    expect(task).not.toBeNull();
    expect(task!.title).toBe("");
    expect(task!.execution).toBeUndefined();
    expect(task!.branch).toBeUndefined();
    expect(task!.pr).toBeUndefined();
    expect(task!.workspace_pr).toBeUndefined();
    expect(task!.blockedReason).toBeUndefined();
    expect(task!.log).toBeUndefined();
  });

  it("uses id parameter when YAML has no id field", () => {
    const raw = `
title: Some task
status: in_progress
depends_on: []
`;
    const task = parseTaskYaml("T9", raw);
    expect(task).not.toBeNull();
    expect(task!.id).toBe("T9");
  });

  it("does not include blockedReason when null", () => {
    const raw = `
id: T5
title: Something
status: ready
depends_on: []
blocked_reason: null
`;
    const task = parseTaskYaml("T5", raw);
    expect(task).not.toBeNull();
    expect(task!.blockedReason).toBeUndefined();
  });

  it("includes blockedReason when set to a string", () => {
    const raw = `
id: T5
title: Something
status: blocked
depends_on: []
blocked_reason: "missing dependency"
`;
    const task = parseTaskYaml("T5", raw);
    expect(task).not.toBeNull();
    expect(task!.blockedReason).toBe("missing dependency");
  });

  it("filters out malformed log entries", () => {
    const raw = `
id: T6
title: Task
status: in_progress
depends_on: []
log:
  - action: created
    by: user@example.com
    at: "2026-01-01T00:00:00Z"
  - action: broken_entry
  - by: someone
    at: "2026-01-02T00:00:00Z"
`;
    const task = parseTaskYaml("T6", raw);
    expect(task).not.toBeNull();
    // Second and third log entries are malformed (missing required fields)
    expect(task!.log).toHaveLength(1);
    expect(task!.log![0].action).toBe("created");
  });

  it("parses pr and workspace_pr as separate top-level fields", () => {
    const raw = `
id: T7
title: Task
status: in_review
depends_on: []
pr:
  url: "https://github.com/owner/repo/pull/1"
  status: open
workspace_pr:
  url: "https://github.com/owner/mgmt/pull/5"
  status: open
`;
    const task = parseTaskYaml("T7", raw);
    expect(task).not.toBeNull();
    expect(task!.pr?.url).toBe("https://github.com/owner/repo/pull/1");
    expect(task!.pr?.status).toBe("open");
    expect(task!.workspace_pr?.url).toBe("https://github.com/owner/mgmt/pull/5");
    expect(task!.workspace_pr?.status).toBe("open");
  });

  it("exports correct TypeScript types", () => {
    // This test validates that exported types are usable
    const task: ParsedTask = {
      id: "T1",
      title: "Test",
      status: "ready",
      dependsOn: [],
    };
    const feature: ParsedFeature = {
      id: "dashboard",
      title: "Dashboard",
      featureStatus: "ready_for_implementation",
      tasks: [task],
    };
    const log: LogEntry = { action: "created", by: "user@a.com", at: "2026-01-01T00:00:00Z" };
    expect(feature.tasks[0].id).toBe("T1");
    expect(log.action).toBe("created");
  });
});
