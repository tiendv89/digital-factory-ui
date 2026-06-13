import { describe, expect, it, vi } from "vitest";

import { getDocumentContent, getDocumentPrStatus } from "@/services/workflow-backend/documents";

// Mock workflowApi to avoid real HTTP
vi.mock("@/constants/axios", () => ({
  workflowApi: {
    get: vi.fn(),
  },
}));

import { workflowApi } from "@/constants/axios";

const mockGet = workflowApi.get as ReturnType<typeof vi.fn>;

describe("getDocumentContent", () => {
  it("calls the correct endpoint and returns content/sha/url", async () => {
    const payload = { content: "# Hello", sha: "abc123", url: "https://github.com/file/path" };
    mockGet.mockResolvedValueOnce({ data: { success: true, data: payload } });

    const result = await getDocumentContent("ws-1", "feat-1", "product_spec");

    expect(mockGet).toHaveBeenCalledWith("/api/workspaces/ws-1/features/feat-1/documents/product_spec/content");
    expect(result.content).toBe("# Hello");
    expect(result.sha).toBe("abc123");
    expect(result.url).toBe("https://github.com/file/path");
  });

  it("works for technical_design type", async () => {
    const payload = { content: "# Design", sha: "def456", url: "https://github.com/td" };
    mockGet.mockResolvedValueOnce({ data: { success: true, data: payload } });

    const result = await getDocumentContent("ws-2", "feat-2", "technical_design");

    expect(mockGet).toHaveBeenCalledWith("/api/workspaces/ws-2/features/feat-2/documents/technical_design/content");
    expect(result.sha).toBe("def456");
  });
});

describe("getDocumentPrStatus", () => {
  it("calls the correct endpoint and returns PR state", async () => {
    const payload = { state: "open", url: "https://github.com/pr/1" };
    mockGet.mockResolvedValueOnce({ data: { success: true, data: payload } });

    const result = await getDocumentPrStatus("ws-1", "feat-1");

    expect(mockGet).toHaveBeenCalledWith("/api/workspaces/ws-1/features/feat-1/documents/pr");
    expect(result.state).toBe("open");
    expect(result.url).toBe("https://github.com/pr/1");
  });

  it("returns none state when no PR exists", async () => {
    const payload = { state: "none", url: null };
    mockGet.mockResolvedValueOnce({ data: { success: true, data: payload } });

    const result = await getDocumentPrStatus("ws-2", "feat-2");

    expect(result.state).toBe("none");
    expect(result.url).toBeNull();
  });

  it("returns merged state", async () => {
    const payload = { state: "merged", url: "https://github.com/pr/2" };
    mockGet.mockResolvedValueOnce({ data: { success: true, data: payload } });

    const result = await getDocumentPrStatus("ws-3", "feat-3");

    expect(result.state).toBe("merged");
  });
});
