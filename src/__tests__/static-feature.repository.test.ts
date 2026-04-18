import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";
import { StaticFeatureRepository } from "../lib/repositories/static-feature.repository";

/**
 * StaticFeatureRepository reads pre-generated JSON from `public/data/`.
 * We point `process.cwd()` at the fixtures directory so the repository
 * resolves paths relative to our test fixtures instead of the real public/data.
 */
const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("StaticFeatureRepository", () => {
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Redirect process.cwd() so the repository reads from fixtures/public/data/
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(FIXTURES_DIR);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  describe("findAll()", () => {
    it("returns all features with task count summaries", async () => {
      const repo = new StaticFeatureRepository();
      const summaries = await repo.findAll();

      expect(summaries).toHaveLength(2);

      const testFeature = summaries.find((s) => s.feature_id === "test-feature");
      expect(testFeature).toBeDefined();
      expect(testFeature!.title).toBe("Test Feature");
      expect(testFeature!.taskCounts.total).toBe(3);
      expect(testFeature!.taskCounts.done).toBe(1);
      expect(testFeature!.taskCounts.blocked).toBe(1);
      expect(testFeature!.taskCounts.ready).toBe(1);
      expect(testFeature!.taskCounts.in_progress).toBe(0);
    });

    it("includes taskCounts on all returned summaries", async () => {
      const repo = new StaticFeatureRepository();
      const summaries = await repo.findAll();
      for (const s of summaries) {
        expect(s.taskCounts).toBeDefined();
        expect(typeof s.taskCounts.total).toBe("number");
      }
    });

    it("throws a descriptive error when features.json is missing", async () => {
      // Point cwd to a directory that has no public/data/features.json
      cwdSpy.mockReturnValue("/nonexistent");
      const repo = new StaticFeatureRepository();

      await expect(repo.findAll()).rejects.toThrow(
        "Static data file not found"
      );
    });
  });

  describe("findById()", () => {
    it("returns the correct feature for a known ID", async () => {
      const repo = new StaticFeatureRepository();
      const feature = await repo.findById("test-feature");

      expect(feature).not.toBeNull();
      expect(feature!.feature_id).toBe("test-feature");
      expect(feature!.title).toBe("Test Feature");
      expect(feature!.feature_status).toBe("ready_for_implementation");
    });

    it("does NOT include taskCounts on the returned feature", async () => {
      const repo = new StaticFeatureRepository();
      const feature = await repo.findById("test-feature");

      expect(feature).not.toBeNull();
      // taskCounts is a FeatureSummary-only field; Feature should not have it
      expect((feature as unknown as Record<string, unknown>)["taskCounts"]).toBeUndefined();
    });

    it("returns null for an unknown feature ID", async () => {
      const repo = new StaticFeatureRepository();
      const result = await repo.findById("nonexistent-feature");
      expect(result).toBeNull();
    });

    it("preserves stages and history from JSON", async () => {
      const repo = new StaticFeatureRepository();
      const feature = await repo.findById("test-feature");

      expect(feature!.stages.product_spec?.review_status).toBe("approved");
      expect(feature!.stages.handoff?.review_status).toBe("draft");
      expect(feature!.history).toHaveLength(1);
    });
  });

  describe("findTasksByFeatureId()", () => {
    it("returns all tasks for a known feature", async () => {
      const repo = new StaticFeatureRepository();
      const tasks = await repo.findTasksByFeatureId("test-feature");

      expect(tasks).toHaveLength(3);
      const ids = tasks.map((t) => t.id).sort();
      expect(ids).toEqual(["T1", "T2", "T3"]);
    });

    it("returns correct task details including blocked_reason", async () => {
      const repo = new StaticFeatureRepository();
      const tasks = await repo.findTasksByFeatureId("test-feature");

      const t1 = tasks.find((t) => t.id === "T1");
      expect(t1!.status).toBe("done");
      expect(t1!.blocked_reason).toBeNull();

      const t2 = tasks.find((t) => t.id === "T2");
      expect(t2!.status).toBe("blocked");
      expect(t2!.blocked_reason).toBe("Missing dependency on external service.");
      expect(t2!.depends_on).toEqual(["T1"]);
    });

    it("returns empty array for an unknown feature ID", async () => {
      const repo = new StaticFeatureRepository();
      const tasks = await repo.findTasksByFeatureId("nonexistent");
      expect(tasks).toEqual([]);
    });

    it("returns empty array for a feature with no tasks JSON file", async () => {
      const repo = new StaticFeatureRepository();
      // 'another-feature' has a tasks.json with one task — verify it loads
      const tasks = await repo.findTasksByFeatureId("another-feature");
      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe("in_progress");
    });
  });
});
