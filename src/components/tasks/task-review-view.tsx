"use client";

import { ExternalLink, GitBranch, GitPullRequest } from "lucide-react";
import { useMemo, useState } from "react";

import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { useTaskDiff } from "@/hooks/tasks/use-task-diff";
import { useTaskReviewThread } from "@/hooks/tasks/use-task-review-thread";
import type { ReviewThreadItemKind, TaskReviewThread } from "@/services/workflow-backend/types";
import type { TaskSummary } from "@/services/workflow-backend/types";

type DiffLine = {
  kind: "add" | "remove" | "context";
  num: number;
  text: string;
};
type PrStatus = "open" | "in_review" | "review_passed" | "changes_requested" | "merged";

interface RepoPill {
  repo: string;
  branch: string;
  pr?: number;
  prStatus?: PrStatus;
  additions: number;
  deletions: number;
  prUrl?: string | null;
}

type ThreadEntryKind = ReviewThreadItemKind | "log_verdict" | "log_blocked";

interface ThreadEntry {
  id: string;
  source: "github" | "log";
  kind: ThreadEntryKind;
  author: string;
  body: string;
  state?: string;
  path?: string;
  line?: number;
  at: string;
}

interface LogEntry {
  action: string;
  by: string;
  at: string;
  note?: string;
}

const DIFF_COLORS = {
  add: {
    bg: "rgba(69,177,100,0.12)",
    text: "#5cb572",
    gutter: "rgba(69,177,100,0.25)",
  },
  remove: {
    bg: "rgba(241,77,76,0.12)",
    text: "#f14d4c",
    gutter: "rgba(241,77,76,0.25)",
  },
  context: { bg: "transparent", text: "#cccccc", gutter: "#333333" },
};

const PR_STATUS_META: Record<PrStatus, { label: string; color: string; bg: string }> = {
  open: {
    label: "Open",
    color: "oklch(0.72 0.13 230)",
    bg: "oklch(0.72 0.13 230 / 0.15)",
  },
  in_review: {
    label: "In Review",
    color: "#cda629",
    bg: "rgba(205,166,41,0.15)",
  },
  review_passed: {
    label: "Review Passed",
    color: "#5cb572",
    bg: "rgba(92,181,114,0.15)",
  },
  changes_requested: {
    label: "Changes Requested",
    color: "oklch(0.70 0.16 30)",
    bg: "oklch(0.70 0.16 30 / 0.15)",
  },
  merged: { label: "Merged", color: "#5cb572", bg: "rgba(92,181,114,0.15)" },
};

/** Parse a unified diff patch string into renderable DiffLine entries. */
export function parsePatch(patch?: string): DiffLine[] {
  if (!patch) return [];
  const lines: DiffLine[] = [];
  let newLineNum = 0;

  for (const raw of patch.split("\n")) {
    if (raw.startsWith("@@")) {
      const m = raw.match(/\+(\d+)/);
      newLineNum = m ? parseInt(m[1], 10) - 1 : 0;
      continue;
    }
    if (raw.startsWith("+++") || raw.startsWith("---")) {
      continue;
    }
    if (raw.startsWith("+")) {
      newLineNum++;
      lines.push({ kind: "add", num: newLineNum, text: raw.slice(1) });
    } else if (raw.startsWith("-")) {
      lines.push({ kind: "remove", num: newLineNum, text: raw.slice(1) });
    } else if (raw.startsWith(" ") || raw === "") {
      newLineNum++;
      lines.push({
        kind: "context",
        num: newLineNum,
        text: raw === "" ? "" : raw.slice(1),
      });
    }
  }
  return lines;
}

/** Merge GitHub thread items with orchestrator log entries, sorted by time. */
export function buildThreadEntries(thread: TaskReviewThread | null, log?: LogEntry[]): ThreadEntry[] {
  const entries: ThreadEntry[] = [];

  if (thread?.items) {
    for (const item of thread.items) {
      entries.push({
        id: `github-${item.kind}-${item.id}`,
        source: "github",
        kind: item.kind,
        author: item.author,
        body: item.body,
        state: item.state,
        path: item.path,
        line: item.line,
        at: item.created_at,
      });
    }
  }

  if (log) {
    for (const entry of log) {
      if (entry.action === "reviewer_complete") {
        entries.push({
          id: `log-reviewer_complete-${entry.at}`,
          source: "log",
          kind: "log_verdict",
          author: entry.by,
          body: entry.note ?? "",
          at: entry.at,
        });
      } else if (entry.action === "review_blocked") {
        entries.push({
          id: `log-review_blocked-${entry.at}`,
          source: "log",
          kind: "log_blocked",
          author: entry.by,
          body: entry.note ?? "Review incomplete.",
          at: entry.at,
        });
      }
    }
  }

  return entries.sort((a, b) => a.at.localeCompare(b.at));
}

function initials(name: string) {
  return name
    .split(/[-_ @]/)
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function parsePrNumber(url?: string | null): number | undefined {
  if (!url) return undefined;
  const m = url.match(/\/pull\/(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function buildRepoPills(task: TaskSummary): RepoPill[] {
  const pills: RepoPill[] = [];
  const refs = [task.pr, task.workspace_pr].filter(Boolean);
  if (refs.length > 0) {
    refs.forEach((ref) => {
      pills.push({
        repo: ref!.repo ?? task.repo ?? "repo",
        branch: task.branch,
        pr: parsePrNumber(ref!.url),
        prStatus: (ref!.status as PrStatus) ?? undefined,
        additions: 0,
        deletions: 0,
        prUrl: ref!.url ?? null,
      });
    });
  } else {
    pills.push({
      repo: task.repo ?? "repo",
      branch: task.branch,
      additions: 0,
      deletions: 0,
    });
  }
  return pills;
}

function AgentAvatar({ name, size = 20 }: { name: string; size?: number }) {
  const px = size;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: px, height: px }} title={name}>
      <span
        className="inline-flex items-center justify-center overflow-hidden"
        style={{
          width: px,
          height: px,
          borderRadius: "28%",
          backgroundColor: "#094771",
          border: "1.5px solid rgba(0,122,204,0.6)",
          fontSize: px * 0.38,
          fontWeight: 600,
          color: "#4fc3f7",
          letterSpacing: "-0.02em",
        }}
      >
        {initials(name)}
      </span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const glyphMap: Record<string, string> = {
    in_review: "◉",
    reviewing: "◉",
    review_passed: "✓",
    done: "●",
    in_progress: "◑",
    todo: "○",
    ready: "◐",
    blocked: "⊗",
    cancelled: "⊘",
  };
  const colorMap: Record<string, { color: string; bg: string; label: string }> = {
    in_review: {
      color: "#cda629",
      bg: "rgba(205,166,41,0.15)",
      label: "In Review",
    },
    reviewing: {
      color: "#cda629",
      bg: "rgba(205,166,41,0.15)",
      label: "Reviewing",
    },
    review_passed: {
      color: "#5cb572",
      bg: "rgba(92,181,114,0.15)",
      label: "Review Passed",
    },
    in_progress: {
      color: "#4fc3f7",
      bg: "rgba(79,195,247,0.15)",
      label: "In Progress",
    },
    done: { color: "#5cb572", bg: "rgba(92,181,114,0.15)", label: "Done" },
    todo: { color: "#858585", bg: "rgba(133,133,133,0.15)", label: "Todo" },
    ready: { color: "#4fc3f7", bg: "rgba(79,195,247,0.15)", label: "Ready" },
    blocked: {
      color: "#f14d4c",
      bg: "rgba(241,77,76,0.15)",
      label: "Blocked",
    },
  };
  const meta = colorMap[status] ?? {
    color: "#858585",
    bg: "rgba(133,133,133,0.15)",
    label: status,
  };
  const glyph = glyphMap[status] ?? "○";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2"
      style={{
        backgroundColor: meta.bg,
        color: meta.color,
        fontSize: 11,
        fontWeight: 500,
        height: 18,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 10 }}>{glyph}</span>
      {meta.label}
    </span>
  );
}

function RepoPillBtn({ pill, active, onClick }: { pill: RepoPill; active: boolean; onClick: () => void }) {
  const prMeta = pill.prStatus ? PR_STATUS_META[pill.prStatus] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 transition-colors"
      style={{
        height: 26,
        fontSize: 11,
        fontFamily: "JetBrains Mono, monospace",
        borderColor: active ? "rgba(0,122,204,0.6)" : "#3c3c3c",
        backgroundColor: active ? "rgba(0,122,204,0.12)" : "#252526",
        color: active ? "#4fc3f7" : "#858585",
        whiteSpace: "nowrap",
      }}
    >
      <GitBranch size={10} style={{ flexShrink: 0 }} />
      <span>{pill.repo}</span>
      {pill.pr != null && (
        <>
          <span style={{ color: "#3c3c3c" }}>·</span>
          <span style={{ color: active ? "#4fc3f7" : "#6e6e6e" }}>#{pill.pr}</span>
        </>
      )}
      {prMeta && (
        <span
          className="rounded px-1"
          style={{
            fontSize: 9,
            fontWeight: 600,
            backgroundColor: prMeta.bg,
            color: prMeta.color,
          }}
        >
          {prMeta.label}
        </span>
      )}
      {pill.additions > 0 && <span style={{ color: "#5cb572", fontSize: 9, fontWeight: 600 }}>+{pill.additions}</span>}
      {pill.deletions > 0 && <span style={{ color: "#f14d4c", fontSize: 9, fontWeight: 600 }}>-{pill.deletions}</span>}
    </button>
  );
}

function DiffRow({ line }: { line: DiffLine }) {
  const colors = DIFF_COLORS[line.kind];
  const prefix = line.kind === "add" ? "+" : line.kind === "remove" ? "-" : " ";
  return (
    <div className="flex items-stretch" style={{ backgroundColor: colors.bg }}>
      <div
        className="flex shrink-0 select-none items-center justify-end px-3"
        style={{
          width: 48,
          fontSize: 10,
          lineHeight: "20px",
          color: "#6e6e6e",
          backgroundColor: colors.gutter,
          fontFamily: "JetBrains Mono, monospace",
          borderRight: "1px solid #3c3c3c",
        }}
      >
        {line.num}
      </div>
      <div
        className="flex-1 px-3 py-0.5"
        style={{
          fontSize: 12,
          lineHeight: "20px",
          fontFamily: "JetBrains Mono, monospace",
          color: colors.text,
          whiteSpace: "pre",
        }}
      >
        <span style={{ opacity: 0.5, marginRight: 8 }}>{prefix}</span>
        {line.text}
      </div>
    </div>
  );
}

function ThreadEntryItem({ entry }: { entry: ThreadEntry }) {
  if (entry.kind === "review_comment") {
    return (
      <div className="ml-8 rounded-lg border p-3" style={{ backgroundColor: "#2d2d2d", borderColor: "#333333" }}>
        <div className="mb-1.5 flex items-center gap-2">
          {entry.path && (
            <span
              style={{
                fontSize: 10,
                color: "#858585",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {entry.path}
              {entry.line != null ? `:${entry.line}` : ""}
            </span>
          )}
          <span style={{ fontSize: 10, color: "#6e6e6e", marginLeft: "auto" }}>{formatTime(entry.at)}</span>
        </div>
        <p style={{ fontSize: 12, color: "#cccccc", lineHeight: 1.5 }}>{entry.body}</p>
      </div>
    );
  }

  const isVerdictEntry = entry.kind === "log_verdict" || entry.kind === "log_blocked";
  const verdictBadge =
    entry.kind === "log_verdict"
      ? {
          label: "Orchestrator Verdict",
          bg: "rgba(79,195,247,0.15)",
          color: "#4fc3f7",
        }
      : entry.kind === "log_blocked"
        ? {
            label: "Review Incomplete",
            bg: "rgba(241,77,76,0.15)",
            color: "#f14d4c",
          }
        : null;

  const reviewStateBadge =
    entry.kind === "review" && entry.state === "APPROVED"
      ? { label: "✓ APPROVED", bg: "rgba(92,181,114,0.2)", color: "#5cb572" }
      : entry.kind === "review" && entry.state === "CHANGES_REQUESTED"
        ? {
            label: "✗ Changes Requested",
            bg: "rgba(205,166,41,0.15)",
            color: "#cda629",
          }
        : null;

  const badge = reviewStateBadge ?? verdictBadge;

  return (
    <div className="flex items-start gap-2.5">
      <AgentAvatar name={entry.author} size={24} />
      <div className="flex-1 min-w-0">
        <div className="mb-2 flex items-center gap-1.5">
          <span style={{ fontSize: 12, fontWeight: 500, color: "#d4d4d4" }}>{entry.author}</span>
          {badge && (
            <span
              className="inline-flex items-center rounded px-1.5"
              style={{
                fontSize: 10,
                fontWeight: 600,
                backgroundColor: badge.bg,
                color: badge.color,
                height: 18,
              }}
            >
              {badge.label}
            </span>
          )}
          {isVerdictEntry && (
            <span
              style={{
                fontSize: 10,
                color: "#6e6e6e",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              orchestrator
            </span>
          )}
          <span style={{ fontSize: 10, color: "#6e6e6e", marginLeft: "auto" }}>{formatTime(entry.at)}</span>
        </div>
        {entry.body && (
          <div className="rounded-lg border p-3" style={{ backgroundColor: "#2d2d2d", borderColor: "#3c3c3c" }}>
            <p style={{ fontSize: 12, color: "#cccccc", lineHeight: 1.6 }}>{entry.body}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskReviewViewProps {
  task: TaskSummary;
}

export function TaskReviewView({ task }: TaskReviewViewProps) {
  const { selectedWorkspaceId } = useWorkspaceContext();

  const basePills = useMemo(() => buildRepoPills(task), [task]);
  const [activeRepo, setActiveRepo] = useState(() => basePills[0]?.repo ?? "");
  const [activeTab, setActiveTab] = useState<"Diff" | "Spec">("Diff");

  const hasPr = task.pr != null || task.workspace_pr != null;

  const diffResult = useTaskDiff(hasPr ? selectedWorkspaceId : null, hasPr ? task.id : null, activeRepo || undefined);

  const threadResult = useTaskReviewThread(hasPr ? selectedWorkspaceId : null, hasPr ? task.id : null, activeRepo || undefined);

  const repos = useMemo((): RepoPill[] => {
    if (!diffResult.data) return basePills;
    return basePills.map((pill) =>
      pill.repo === activeRepo
        ? {
            ...pill,
            additions: diffResult.data!.total_additions,
            deletions: diffResult.data!.total_deletions,
          }
        : pill,
    );
  }, [basePills, diffResult.data, activeRepo]);

  const threadEntries = useMemo(() => buildThreadEntries(threadResult.data, task.log as LogEntry[] | undefined), [threadResult.data, task.log]);

  const currentRepo = repos.find((r) => r.repo === activeRepo) ?? repos[0];
  const prMeta = currentRepo?.prStatus ? PR_STATUS_META[currentRepo.prStatus] : null;
  const taskId = task.task_id?.toUpperCase() ?? task.task_name?.toUpperCase() ?? task.id.slice(0, 8).toUpperCase();
  const assigneeName = task.execution?.last_updated_by ?? "agent-reviewer";

  return (
    <div className="flex h-full overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
      {/* ── Left: Diff / Spec ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Task header */}
        <div
          className="flex shrink-0 items-center gap-2.5 border-b px-5"
          style={{
            height: 52,
            borderColor: "#3c3c3c",
            backgroundColor: "#252526",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#4fc3f7",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {taskId}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#d4d4d4" }}>{task.title ?? task.task_name}</span>
          <StatusBadge status={task.status} />
          <div className="flex-1" />
          <AgentAvatar name={assigneeName} size={20} />
          <span style={{ fontSize: 11, color: "#858585" }}>{assigneeName}</span>
        </div>

        {/* Repo selector bar */}
        {repos.length > 0 && (
          <div
            className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b px-5"
            style={{
              height: 44,
              borderColor: "#3c3c3c",
              backgroundColor: "#1e1e1e",
              scrollbarWidth: "none",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#6e6e6e",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                flexShrink: 0,
              }}
            >
              {repos.length} {repos.length === 1 ? "repo" : "repos"}
            </span>
            <div className="shrink-0" style={{ width: 1, height: 14, backgroundColor: "#3c3c3c" }} />
            {repos.map((r, i) => (
              <RepoPillBtn key={`${r.repo}-${r.pr ?? i}`} pill={r} active={r.repo === activeRepo} onClick={() => setActiveRepo(r.repo)} />
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div
          className="flex shrink-0 items-center border-b"
          style={{
            height: 36,
            borderColor: "#3c3c3c",
            backgroundColor: "#252526",
          }}
        >
          {(["Diff", "Spec"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="border-r px-4"
              style={{
                height: 36,
                borderColor: "#3c3c3c",
                fontSize: 12,
                fontWeight: 500,
                color: activeTab === tab ? "#d4d4d4" : "#858585",
                borderBottom: activeTab === tab ? "2px solid #007acc" : "2px solid transparent",
                backgroundColor: activeTab === tab ? "#1e1e1e" : "#252526",
              }}
            >
              {tab}
            </button>
          ))}
          <div className="flex flex-1 items-center justify-end px-4">
            <div className="flex items-center gap-1.5">
              <GitBranch size={12} style={{ color: "#858585" }} />
              <span
                style={{
                  fontSize: 11,
                  color: "#858585",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {currentRepo?.branch ?? task.branch}
              </span>
            </div>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "Diff" ? <DiffPanel hasPr={hasPr} diffResult={diffResult} /> : <SpecPanel task={task} />}
      </div>

      {/* ── Right: Review thread ── */}
      <div
        className="flex shrink-0 flex-col overflow-hidden border-l"
        style={{
          width: 400,
          borderColor: "#3c3c3c",
          backgroundColor: "#252526",
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center border-b px-4" style={{ height: 52, borderColor: "#3c3c3c" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d4" }}>Review Thread</span>
          {currentRepo?.pr != null && (
            <div className="ml-auto flex items-center gap-1.5">
              <GitPullRequest size={12} style={{ color: "#858585" }} />
              <span
                style={{
                  fontSize: 12,
                  color: "#858585",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                #{currentRepo.pr}
              </span>
              {prMeta && (
                <span
                  className="inline-flex items-center rounded px-1.5"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    backgroundColor: prMeta.bg,
                    color: prMeta.color,
                    height: 18,
                  }}
                >
                  {prMeta.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Thread body */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" style={{ scrollbarWidth: "none" }}>
          <ThreadPanel hasPr={hasPr} threadResult={threadResult} threadEntries={threadEntries} currentRepo={currentRepo} />
        </div>
      </div>
    </div>
  );
}

interface DiffPanelProps {
  hasPr: boolean;
  diffResult: ReturnType<typeof useTaskDiff>;
}

function DiffPanel({ hasPr, diffResult }: DiffPanelProps) {
  if (!hasPr) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ backgroundColor: "#1e1e1e" }}>
        <p style={{ fontSize: 12, color: "#858585" }}>No pull request yet — diff will appear when a PR is opened.</p>
      </div>
    );
  }

  if (diffResult.loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ backgroundColor: "#1e1e1e" }}>
        <p style={{ fontSize: 12, color: "#858585" }}>Loading diff…</p>
      </div>
    );
  }

  if (diffResult.error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2" style={{ backgroundColor: "#1e1e1e" }}>
        <p style={{ fontSize: 12, color: "#f14d4c" }}>Failed to load diff: {diffResult.error.message}</p>
        <button
          type="button"
          onClick={diffResult.reload}
          style={{
            fontSize: 11,
            color: "#4fc3f7",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const files = diffResult.data?.files ?? [];

  if (files.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ backgroundColor: "#1e1e1e" }}>
        <p style={{ fontSize: 12, color: "#858585" }}>No changes in this pull request.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#1e1e1e", scrollbarWidth: "none" }}>
      {files.map((file) => {
        const diffLines = parsePatch(file.patch);
        return (
          <div key={file.filename} className="mx-5 my-3 overflow-hidden rounded-lg border" style={{ borderColor: "#3c3c3c" }}>
            <div className="flex items-center gap-2.5 border-b px-3 py-2" style={{ borderColor: "#3c3c3c", backgroundColor: "#252526" }}>
              <span
                style={{
                  fontSize: 11,
                  color: "#858585",
                  fontFamily: "JetBrains Mono, monospace",
                  wordBreak: "break-all",
                }}
              >
                {file.filename}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#5cb572",
                  marginLeft: "auto",
                  whiteSpace: "nowrap",
                }}
              >
                +{file.additions}
              </span>
              <span style={{ fontSize: 10, color: "#f14d4c", whiteSpace: "nowrap" }}>-{file.deletions}</span>
            </div>
            {diffLines.length > 0 ? (
              diffLines.map((line, i) => <DiffRow key={i} line={line} />)
            ) : (
              <div className="px-3 py-2" style={{ fontSize: 11, color: "#6e6e6e" }}>
                Binary or empty diff
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface SpecPanelProps {
  task: TaskSummary;
}

function SpecPanel({ task }: SpecPanelProps) {
  const taskId = task.task_id?.toUpperCase() ?? task.task_name?.toUpperCase() ?? task.id.slice(0, 8).toUpperCase();
  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ backgroundColor: "#1e1e1e", scrollbarWidth: "none" }}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#4fc3f7",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {taskId}
          </span>
          <StatusBadge status={task.status} />
        </div>

        <div>
          <span
            style={{
              fontSize: 11,
              color: "#6e6e6e",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Title
          </span>
          <p style={{ fontSize: 13, color: "#d4d4d4", marginTop: 4 }}>{task.title ?? task.task_name}</p>
        </div>

        {task.description && (
          <div>
            <span
              style={{
                fontSize: 11,
                color: "#6e6e6e",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Description
            </span>
            <p
              style={{
                fontSize: 12,
                color: "#cccccc",
                lineHeight: 1.6,
                marginTop: 4,
                whiteSpace: "pre-wrap",
              }}
            >
              {task.description}
            </p>
          </div>
        )}

        {(task.depends_on?.length ?? 0) > 0 && (
          <div>
            <span
              style={{
                fontSize: 11,
                color: "#6e6e6e",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Depends on
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {task.depends_on!.map((dep) => (
                <span
                  key={dep}
                  style={{
                    fontSize: 11,
                    fontFamily: "JetBrains Mono, monospace",
                    color: "#4fc3f7",
                    backgroundColor: "rgba(79,195,247,0.1)",
                    padding: "2px 6px",
                    borderRadius: 4,
                    border: "1px solid rgba(79,195,247,0.2)",
                  }}
                >
                  {dep}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-6">
          <div>
            <span
              style={{
                fontSize: 11,
                color: "#6e6e6e",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Repo
            </span>
            <p
              style={{
                fontSize: 12,
                color: "#cccccc",
                fontFamily: "JetBrains Mono, monospace",
                marginTop: 4,
              }}
            >
              {task.repo}
            </p>
          </div>
          <div>
            <span
              style={{
                fontSize: 11,
                color: "#6e6e6e",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Branch
            </span>
            <p
              style={{
                fontSize: 12,
                color: "#cccccc",
                fontFamily: "JetBrains Mono, monospace",
                marginTop: 4,
              }}
            >
              {task.branch}
            </p>
          </div>
        </div>

        {task.blocked_reason && (
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: "rgba(241,77,76,0.3)",
              backgroundColor: "rgba(241,77,76,0.05)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#f14d4c",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Blocked
            </span>
            <p style={{ fontSize: 12, color: "#cccccc", marginTop: 4 }}>{task.blocked_reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ThreadPanelProps {
  hasPr: boolean;
  threadResult: ReturnType<typeof useTaskReviewThread>;
  threadEntries: ThreadEntry[];
  currentRepo: RepoPill | undefined;
}

function ThreadPanel({ hasPr, threadResult, threadEntries, currentRepo }: ThreadPanelProps) {
  if (!hasPr) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p style={{ fontSize: 12, color: "#858585" }}>No pull request yet.</p>
      </div>
    );
  }

  if (threadResult.loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p style={{ fontSize: 12, color: "#858585" }}>Loading review thread…</p>
      </div>
    );
  }

  if (threadResult.error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <p style={{ fontSize: 12, color: "#f14d4c" }}>Failed to load review thread.</p>
        <button
          type="button"
          onClick={threadResult.reload}
          style={{
            fontSize: 11,
            color: "#4fc3f7",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {threadEntries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p style={{ fontSize: 12, color: "#858585" }}>No review activity yet.</p>
        </div>
      ) : (
        threadEntries.map((entry) => <ThreadEntryItem key={entry.id} entry={entry} />)
      )}

      {/* Action note — managed by review workflow */}
      <div className="mt-2 rounded-lg border p-4" style={{ backgroundColor: "#2d2d2d", borderColor: "#3c3c3c" }}>
        <p
          style={{
            fontSize: 11,
            color: "#858585",
            marginBottom: currentRepo?.prUrl ? 8 : 0,
            lineHeight: 1.5,
          }}
        >
          Merge and review actions are managed by the review workflow.
        </p>
        {currentRepo?.prUrl && (
          <a
            href={currentRepo.prUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border px-3"
            style={{
              height: 30,
              borderColor: "#3c3c3c",
              color: "#4fc3f7",
              fontSize: 12,
              textDecoration: "none",
              backgroundColor: "#1e1e1e",
            }}
          >
            <ExternalLink size={11} />
            View PR{currentRepo.pr != null ? ` #${currentRepo.pr}` : ""} on GitHub
          </a>
        )}
      </div>
    </>
  );
}
