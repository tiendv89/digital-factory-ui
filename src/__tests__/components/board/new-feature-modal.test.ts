import { describe, expect, it } from "vitest";

import { ORCHESTRATOR_OPTIONS } from "@/components/board/new-feature-modal";

describe("ORCHESTRATOR_OPTIONS", () => {
  it("contains exactly two options", () => {
    expect(ORCHESTRATOR_OPTIONS).toHaveLength(2);
  });

  it("has TypeScript / Git as the first option with value 'ts'", () => {
    const first = ORCHESTRATOR_OPTIONS[0];
    expect(first.value).toBe("ts");
    expect(first.label).toContain("TypeScript");
  });

  it("has Postgres / Go as the second option with value 'go'", () => {
    const second = ORCHESTRATOR_OPTIONS[1];
    expect(second.value).toBe("go");
    expect(second.label).toContain("Go");
  });

  it("each option has a non-empty description", () => {
    for (const opt of ORCHESTRATOR_OPTIONS) {
      expect(opt.description.length).toBeGreaterThan(0);
    }
  });

  it("all option values are either 'ts' or 'go'", () => {
    const validValues = new Set(["ts", "go"]);
    for (const opt of ORCHESTRATOR_OPTIONS) {
      expect(validValues.has(opt.value)).toBe(true);
    }
  });
});
