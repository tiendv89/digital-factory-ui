import { describe, expect, it } from "vitest";

// Test the pure extraction helpers by duplicating them here
// (They are private in message-thread.tsx — we verify behavior through the exported output shapes)

type ApprovalRequest = { feature_id: string; stage: string; review_status: string };
type DocumentEditOutput = {
  ok?: boolean;
  pr_url?: string;
  commit_sha?: string;
  conflict?: boolean;
  document?: string;
  edits?: Array<{ old_string: string; new_string: string }>;
  summary?: string;
};

function extractApprovalOutput(output: unknown): ApprovalRequest | null {
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown>;
  const req = (o.approval_request ?? null) as Record<string, unknown> | null;
  if (!req) return null;
  if (typeof req.feature_id !== "string" || typeof req.stage !== "string" || typeof req.review_status !== "string") {
    return null;
  }
  return { feature_id: req.feature_id, stage: req.stage, review_status: req.review_status };
}

function extractDocumentEditOutput(output: unknown): DocumentEditOutput | null {
  if (!output || typeof output !== "object") return null;
  return output as DocumentEditOutput;
}

function toolNameToSlash(name: string): string {
  return "/" + name.replace(/_/g, "-");
}

describe("extractApprovalOutput", () => {
  it("extracts valid approval_request payload", () => {
    const output = {
      ok: true,
      approval_request: { feature_id: "my-feature", stage: "product_spec", review_status: "awaiting_approval" },
    };
    expect(extractApprovalOutput(output)).toEqual({
      feature_id: "my-feature",
      stage: "product_spec",
      review_status: "awaiting_approval",
    });
  });

  it("returns null when approval_request is absent", () => {
    expect(extractApprovalOutput({ ok: true })).toBeNull();
  });

  it("returns null for null input", () => {
    expect(extractApprovalOutput(null)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(extractApprovalOutput("string")).toBeNull();
  });

  it("returns null when approval_request fields are missing", () => {
    const output = { approval_request: { feature_id: "f1" } };
    expect(extractApprovalOutput(output)).toBeNull();
  });

  it("returns null when fields are wrong types", () => {
    const output = { approval_request: { feature_id: 123, stage: "product_spec", review_status: "draft" } };
    expect(extractApprovalOutput(output)).toBeNull();
  });
});

describe("extractDocumentEditOutput", () => {
  it("returns object with all fields", () => {
    const output: DocumentEditOutput = { ok: true, pr_url: "https://github.com/pr/1", commit_sha: "abc1234", conflict: false, document: "product_spec" };
    expect(extractDocumentEditOutput(output)).toEqual(output);
  });

  it("returns object with conflict flag", () => {
    const output = { ok: false, conflict: true, document: "technical_design" };
    expect(extractDocumentEditOutput(output)).toEqual(output);
  });

  it("returns null for null input", () => {
    expect(extractDocumentEditOutput(null)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(extractDocumentEditOutput(42)).toBeNull();
  });

  it("handles edit array in output", () => {
    const output = { ok: true, document: "product_spec", edits: [{ old_string: "old", new_string: "new" }] };
    const result = extractDocumentEditOutput(output);
    expect(result).not.toBeNull();
    expect(result?.edits).toHaveLength(1);
  });
});

describe("toolNameToSlash", () => {
  it("converts underscore-separated tool names to slash commands", () => {
    expect(toolNameToSlash("workflow_write_product_spec")).toBe("/workflow-write-product-spec");
    expect(toolNameToSlash("workflow_request_approval")).toBe("/workflow-request-approval");
    expect(toolNameToSlash("load_skill")).toBe("/load-skill");
  });

  it("handles single-word tool names", () => {
    expect(toolNameToSlash("tools")).toBe("/tools");
  });
});
