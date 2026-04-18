import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import { FilesystemFeatureRepository } from "../lib/repositories/filesystem-feature.repository";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("FilesystemFeatureRepository", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.WORKSPACE_MGMT_PATH;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.WORKSPACE_MGMT_PATH;
    } else {
      process.env.WORKSPACE_MGMT_PATH = originalEnv;
    }
  });

  describe("missing WORKSPACE_MGMT_PATH", () => {
    it("throws a clear error when WORKSPACE_MGMT_PATH is not set", async () => {
      delete process.env.WORKSPACE_MGMT_PATH;
      const repo = new FilesystemFeatureRepository();

      await expect(repo.findAll()).rejects.toThrow(
        "WORKSPACE_MGMT_PATH environment variable is not set"
      );
      await expect(repo.findById("test-feature")).rejects.toThrow(
        "WORKSPACE_MGMT_PATH environment variable is not set"
      );
      await expect(
        repo.findTasksByFeatureId("test-feature")
      ).rejects.toThrow(
        "WORKSPACE_MGMT_PATH environment variable is not set"
      );
    });
  });

  describe("findAll()", () => {
    it("returns all features with correct task count summaries", async () => {
      process.env.WORKSPACE_MGMT_PATH = FIXTURES_DIR;
      const repo = new FilesystemFeatureRepository();
      const summaries = await repo.findAll();

      // Should find both test-feature and another-feature
      expect(summaries.length).toBe(2);

      const testFeature = summaries.find(
        (s) => s.feature_id === "test-feature"
      );
      expect(testFeature).toBeDefined();
      expect(testFeature!.title).toBe("Test Feature");
      expect(testFeature!.taskCounts.total).toBe(3);
      expect(testFeature!.taskCounts.done).toBe(1);
      expect(testFeature!.taskCounts.blocked).toBe(1);
      expect(testFeature!.taskCounts.ready).toBe(1);
      expect(testFeature!.taskCounts.in_progress).toBe(0);
      expect(testFeature!.taskCounts.in_review).toBe(0);

      const anotherFeature = summaries.find(
        (s) => s.feature_id === "another-feature"
      );
      expect(anotherFeature).toBeDefined();
      expect(anotherFeature!.taskCounts.total).toBe(1);
      expect(anotherFeature!.taskCounts.in_progress).toBe(1);
      expect(anotherFeature!.taskCounts.done).toBe(0);
    });

    it("returns empty array when features directory does not exist", async () => {
      process.env.WORKSPACE_MGMT_PATH = "/nonexistent/path";
      const repo = new FilesystemFeatureRepository();
      const summaries = await repo.findAll();
      expect(summaries).toEqual([]);
    });
  });

  describe("findById()", () => {
    it("returns the correct feature for a known ID", async () => {
      process.env.WORKSPACE_MGMT_PATH = FIXTURES_DIR;
      const repo = new FilesystemFeatureRepository();
      const feature = await repo.findById("test-feature");

      expect(feature).not.toBeNull();
      expect(feature!.feature_id).toBe("test-feature");
      expect(feature!.title).toBe("Test Feature");
      expect(feature!.feature_status).toBe("ready_for_implementation");
      expect(feature!.current_stage).toBe("tasks");
    });

    it("returns null for an unknown feature ID", async () => {
      process.env.WORKSPACE_MGMT_PATH = FIXTURES_DIR;
      const repo = new FilesystemFeatureRepository();
      const feature = await repo.findById("nonexistent-feature");

      expect(feature).toBeNull();
    });

    it("parses stages correctly", async () => {
      process.env.WORKSPACE_MGMT_PATH = FIXTURES_DIR;
      const repo = new FilesystemFeatureRepository();
      const feature = await repo.findById("test-feature");

      expect(feature!.stages.product_spec?.review_status).toBe("approved");
      expect(feature!.stages.product_spec?.reviewed_by).toBe(
        "tester@example.com"
      );
      expect(feature!.stages.handoff?.review_status).toBe("draft");
    });

    it("parses history correctly", async () => {
      process.env.WORKSPACE_MGMT_PATH = FIXTURES_DIR;
      const repo = new FilesystemFeatureRepository();
      const feature = await repo.findById("test-feature");

      expect(feature!.history).toHaveLength(1);
      expect(feature!.history[0].action).toBe("approved");
      expect(feature!.history[0].by).toBe("tester@example.com");
    });
  });

  describe("findTasksByFeatureId()", () => {
    it("returns all tasks for a known feature", async () => {
      process.env.WORKSPACE_MGMT_PATH = FIXTURES_DIR;
      const repo = new FilesystemFeatureRepository();
      const tasks = await repo.findTasksByFeatureId("test-feature");

      expect(tasks).toHaveLength(3);
      const ids = tasks.map((t) => t.id).sort();
      expect(ids).toEqual(["T1", "T2", "T3"]);
    });

    it("returns correct task details", async () => {
      process.env.WORKSPACE_MGMT_PATH = FIXTURES_DIR;
      const repo = new FilesystemFeatureRepository();
      const tasks = await repo.findTasksByFeatureId("test-feature");

      const t1 = tasks.find((t) => t.id === "T1");
      expect(t1).toBeDefined();
      expect(t1!.title).toBe("First task");
      expect(t1!.status).toBe("done");
      expect(t1!.depends_on).toEqual([]);
      expect(t1!.blocked_reason).toBeNull();
      expect(t1!.pr.url).toBe(
        "https://github.com/example/test-repo/pull/1"
      );
      expect(t1!.pr.status).toBe("merged");
      expect(t1!.log).toHaveLength(2);

      const t2 = tasks.find((t) => t.id === "T2");
      expect(t2).toBeDefined();
      expect(t2!.status).toBe("blocked");
      expect(t2!.blocked_reason).toBe(
        "Missing dependency on external service."
      );
      expect(t2!.depends_on).toEqual(["T1"]);

      const t3 = tasks.find((t) => t.id === "T3");
      expect(t3).toBeDefined();
      expect(t3!.status).toBe("ready");
    });

    it("returns empty array for a nonexistent feature", async () => {
      process.env.WORKSPACE_MGMT_PATH = FIXTURES_DIR;
      const repo = new FilesystemFeatureRepository();
      const tasks = await repo.findTasksByFeatureId("nonexistent-feature");
      expect(tasks).toEqual([]);
    });
  });
});
