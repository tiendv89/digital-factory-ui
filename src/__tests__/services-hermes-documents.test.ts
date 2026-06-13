import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { saveDocument, StaleDocumentError } from "@/services/hermes-agent/documents";

// Mock the constants/axios module to avoid env dependency
vi.mock("@/constants/axios", () => ({
  getBffBaseUrl: () => "http://bff.test",
}));

const makeFetchMock = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });

describe("StaleDocumentError", () => {
  it("is an instance of Error", () => {
    const err = new StaleDocumentError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("StaleDocumentError");
    expect(err.message).toBeTruthy();
  });
});

describe("saveDocument", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("sends a PUT request with correct body and credentials", async () => {
    const mockFetch = makeFetchMock(200, { pr_url: "https://github.com/pr/1", commit_sha: "abc123" });
    global.fetch = mockFetch;

    const result = await saveDocument("feat-1", "product_spec", "# Hello", "sha-abc");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://bff.test/bff/hermes-agent/api/v1/features/feat-1/document");
    expect(options.method).toBe("PUT");
    expect(options.credentials).toBe("include");

    const body = JSON.parse(options.body as string) as { document: string; content: string; base_sha: string };
    expect(body.document).toBe("product_spec");
    expect(body.content).toBe("# Hello");
    expect(body.base_sha).toBe("sha-abc");

    expect(result.pr_url).toBe("https://github.com/pr/1");
    expect(result.commit_sha).toBe("abc123");
  });

  it("accepts null base_sha (new file)", async () => {
    const mockFetch = makeFetchMock(200, { pr_url: "https://github.com/pr/1", commit_sha: "new" });
    global.fetch = mockFetch;

    await saveDocument("feat-2", "technical_design", "# Design", null);
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string) as { base_sha: null };
    expect(body.base_sha).toBeNull();
  });

  it("throws StaleDocumentError on 409", async () => {
    global.fetch = makeFetchMock(409, { error: "conflict" });

    await expect(saveDocument("feat-3", "product_spec", "# Hello", "old-sha")).rejects.toBeInstanceOf(StaleDocumentError);
  });

  it("throws a generic error on non-2xx non-409 responses", async () => {
    global.fetch = makeFetchMock(500, { error: "internal error" });

    await expect(saveDocument("feat-4", "product_spec", "# Hello", "sha")).rejects.toThrow(/saveDocument failed/);
  });
});
