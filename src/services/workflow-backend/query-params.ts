export type FeatureSearchParams = {
  title?: string;
  status?: string | string[];
  sort?: string;
  page?: number;
  limit?: number;
};

export type FeatureTaskParams = {
  status?: string | string[];
  title?: string;
  query?: string;
  page?: number;
  limit?: number;
  sort?: string;
};

export type TaskSearchParams = {
  task_id?: string;
  title?: string;
  status?: string | string[];
  repo?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export function buildFeatureParams(params: FeatureSearchParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.title) sp.set("title", params.title);
  if (params.status !== undefined) {
    sp.set("status", Array.isArray(params.status) ? params.status.join(",") : params.status);
  }
  if (params.sort) sp.set("sort", params.sort);
  if (params.page !== undefined) sp.set("page", String(params.page));
  if (params.limit !== undefined) sp.set("limit", String(params.limit));
  return sp;
}

function buildTaskParams(params: TaskSearchParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.task_id) sp.set("task_id", params.task_id);
  if (params.title) sp.set("title", params.title);
  if (params.status !== undefined) {
    sp.set("status", Array.isArray(params.status) ? params.status.join(",") : params.status);
  }
  if (params.repo) sp.set("repo", params.repo);
  if (params.sort) sp.set("sort", params.sort);
  if (params.page !== undefined) sp.set("page", String(params.page));
  if (params.limit !== undefined) sp.set("limit", String(params.limit));
  return sp;
}

export const SIDEBAR_TASK_PARAMS: URLSearchParams = buildTaskParams({
  status: ["blocked", "in_progress", "reviewing", "in_review", "ready"],
  sort: "task_id_asc",
  page: 1,
  limit: 50,
});

export function buildFeatureTaskParams(params: FeatureTaskParams): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("include", "tasks");
  if (params.status !== undefined) {
    const csv = Array.isArray(params.status) ? [...params.status].sort().join(",") : params.status;
    if (csv) sp.set("status", csv);
  }
  if (params.title) sp.set("title", params.title);
  if (params.query) sp.set("query", params.query);
  if (params.page !== undefined) sp.set("page", String(params.page));
  if (params.limit !== undefined) sp.set("limit", String(params.limit));
  if (params.sort) sp.set("sort", params.sort);
  return sp;
}
