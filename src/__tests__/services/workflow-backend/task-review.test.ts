import axios, { type AxiosResponse } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { workflowApi } from "@/constants/axios";
import { getTaskDiff, getTaskReviewThread } from "@/services/workflow-backend/client";
import type { TaskDiff, TaskReviewThread } from "@/services/workflow-backend/types";

vi.mock("@/constants/axios", () => ({
  workflowApi: {
    request: vi.fn(),
  },
}));

const mockRequest = vi.mocked(workflowApi.request);

function makeAxiosError(status: number, errorBody?: { code: string; message: string; retryable: boolean }) {
  const data = errorBody ? { success: false, error: errorBody } : { success: false };
  const err = new axios.AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data,
  } as AxiosResponse);
  return err;
}

describe("getTaskDiff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns diff data from the envelope", async () => {
    const payload: TaskDiff = {
      files: [{ filename: "src/foo.ts", status: "modified", additions: 3, deletions: 1, changes: 4, patch: "@@ -1 +1 @@" }],
      total_additions: 3,
      total_deletions: 1,
      diff_text: "diff --git...",
    };
    mockRequest.mockResolvedValueOnce({ data: { success: true, data: payload } });

    const result = await getTaskDiff("ws1", "T1");
    expect(result).toEqual(payload);
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ url: "/api/workspaces/ws1/tasks/T1/diff", method: "GET" }));
  });

  it("appends repo query param when provided", async () => {
    const payload: TaskDiff = { files: [], total_additions: 0, total_deletions: 0 };
    mockRequest.mockResolvedValueOnce({ data: { success: true, data: payload } });

    await getTaskDiff("ws1", "T1", "digital-factory-ui");
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ url: "/api/workspaces/ws1/tasks/T1/diff?repo=digital-factory-ui" }));
  });

  it("throws ApiError when success is false", async () => {
    const apiError = { code: "NOT_FOUND", message: "task not found", retryable: false };
    mockRequest.mockResolvedValueOnce({ data: { success: false, error: apiError } });

    await expect(getTaskDiff("ws1", "T1")).rejects.toMatchObject(apiError);
  });

  it("maps axios 404 response to ApiError", async () => {
    mockRequest.mockRejectedValueOnce(makeAxiosError(404, { code: "NOT_FOUND", message: "not found", retryable: false }));

    await expect(getTaskDiff("ws1", "T1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("maps axios network error to UNKNOWN_ERROR", async () => {
    const networkErr = new axios.AxiosError("Network Error");
    mockRequest.mockRejectedValueOnce(networkErr);

    await expect(getTaskDiff("ws1", "T1")).rejects.toMatchObject({ code: "UNKNOWN_ERROR", retryable: false });
  });

  it("returns empty diff when task has no PR yet (empty files array)", async () => {
    const empty: TaskDiff = { files: [], total_additions: 0, total_deletions: 0 };
    mockRequest.mockResolvedValueOnce({ data: { success: true, data: empty } });

    const result = await getTaskDiff("ws1", "T1");
    expect(result.files).toHaveLength(0);
    expect(result.total_additions).toBe(0);
  });
});

describe("getTaskReviewThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns thread data from the envelope", async () => {
    const payload: TaskReviewThread = {
      items: [
        { id: 1, kind: "review", author: "reviewer1", body: "LGTM", state: "APPROVED", created_at: "2026-01-01T00:00:00Z" },
        { id: 2, kind: "review_comment", author: "reviewer1", body: "nit: rename this", path: "src/foo.ts", line: 42, created_at: "2026-01-01T01:00:00Z" },
      ],
    };
    mockRequest.mockResolvedValueOnce({ data: { success: true, data: payload } });

    const result = await getTaskReviewThread("ws1", "T1");
    expect(result).toEqual(payload);
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ url: "/api/workspaces/ws1/tasks/T1/review-thread", method: "GET" }));
  });

  it("appends repo query param when provided", async () => {
    const payload: TaskReviewThread = { items: [] };
    mockRequest.mockResolvedValueOnce({ data: { success: true, data: payload } });

    await getTaskReviewThread("ws1", "T1", "workspace-repo");
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ url: "/api/workspaces/ws1/tasks/T1/review-thread?repo=workspace-repo" }));
  });

  it("throws ApiError when success is false", async () => {
    const apiError = { code: "UNAUTHORIZED", message: "not allowed", retryable: false };
    mockRequest.mockResolvedValueOnce({ data: { success: false, error: apiError } });

    await expect(getTaskReviewThread("ws1", "T1")).rejects.toMatchObject(apiError);
  });

  it("maps axios 500 response to retryable ApiError (no error body)", async () => {
    mockRequest.mockRejectedValueOnce(makeAxiosError(500));

    await expect(getTaskReviewThread("ws1", "T1")).rejects.toMatchObject({ code: "UNKNOWN_ERROR", retryable: true });
  });

  it("returns empty items when task has no PR yet", async () => {
    const empty: TaskReviewThread = { items: [] };
    mockRequest.mockResolvedValueOnce({ data: { success: true, data: empty } });

    const result = await getTaskReviewThread("ws1", "T1");
    expect(result.items).toHaveLength(0);
  });

  it("URL-encodes the repo param", async () => {
    const payload: TaskReviewThread = { items: [] };
    mockRequest.mockResolvedValueOnce({ data: { success: true, data: payload } });

    await getTaskReviewThread("ws1", "T1", "my repo/with spaces");
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ url: "/api/workspaces/ws1/tasks/T1/review-thread?repo=my%20repo%2Fwith%20spaces" }));
  });
});
