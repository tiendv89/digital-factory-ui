"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, File, Folder, GitBranch, GitPullRequest } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useMemo, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { useTaskDiff } from "@/hooks/tasks/use-task-diff";
import { useTaskReviewThread } from "@/hooks/tasks/use-task-review-thread";
import type { PRFile, ReviewThreadItemKind, TaskReviewThread } from "@/services/workflow-backend/types";
import type { TaskSummary } from "@/services/workflow-backend/types";
import { MarkdownContent } from "@/utils/markdown";

type DiffLine = {
  kind: "add" | "remove" | "context";
  num: number;
  text: string;
};
type PrStatus = "open" | "in_review" | "review_passed" | "changes_requested" | "merged";

export interface RepoPill {
  repo: string;
  branch: string;
  pr?: number;
  prStatus?: PrStatus;
  additions: number;
  deletions: number;
  prUrl?: string | null;
}

type ThreadEntryKind = ReviewThreadItemKind | "log_verdict" | "log_blocked";

export interface ThreadEntry {
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

/** Map a filename to a Prism language id for syntax highlighting (null = no highlight). */
export function languageFromFilename(filename: string): string | null {
  const base = filename.split("/").pop()?.toLowerCase() ?? "";
  if (base === "dockerfile" || base.startsWith("dockerfile.")) return "docker";
  if (base === "makefile") return "makefile";
  if (base === "go.mod" || base === "go.sum") return "go";
  const ext = base.includes(".") ? base.slice(base.lastIndexOf(".") + 1) : "";
  const map: Record<string, string> = {
    go: "go",
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    mjs: "javascript",
    cjs: "javascript",
    py: "python",
    rb: "ruby",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    kts: "kotlin",
    swift: "swift",
    c: "c",
    h: "c",
    cc: "cpp",
    cpp: "cpp",
    cxx: "cpp",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    yml: "yaml",
    yaml: "yaml",
    json: "json",
    md: "markdown",
    mdx: "markdown",
    sql: "sql",
    html: "markup",
    xml: "markup",
    svg: "markup",
    vue: "markup",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    toml: "toml",
    ini: "ini",
    graphql: "graphql",
    gql: "graphql",
    proto: "protobuf",
  };
  return map[ext] ?? null;
}

export type DiffTreeNode = { kind: "dir"; name: string; path: string; children: DiffTreeNode[] } | { kind: "file"; name: string; path: string; file: PRFile };

/** Build a GitHub-style nested tree from a flat list of changed files, collapsing single-child dir chains. */
export function buildFileTree(files: PRFile[]): DiffTreeNode[] {
  const root: DiffTreeNode[] = [];
  for (const file of files) {
    const parts = file.filename.split("/");
    let level = root;
    let prefix = "";
    parts.forEach((part, i) => {
      prefix = prefix ? `${prefix}/${part}` : part;
      if (i === parts.length - 1) {
        level.push({ kind: "file", name: part, path: file.filename, file });
        return;
      }
      let dir = level.find((n): n is Extract<DiffTreeNode, { kind: "dir" }> => n.kind === "dir" && n.name === part);
      if (!dir) {
        dir = { kind: "dir", name: part, path: prefix, children: [] };
        level.push(dir);
      }
      level = dir.children;
    });
  }

  const sortLevel = (nodes: DiffTreeNode[]) => nodes.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "dir" ? -1 : 1));

  const compress = (nodes: DiffTreeNode[]): DiffTreeNode[] => {
    sortLevel(nodes);
    return nodes.map((n) => {
      if (n.kind !== "dir") return n;
      let node = n;
      while (node.children.length === 1 && node.children[0].kind === "dir") {
        const child = node.children[0];
        node = {
          kind: "dir",
          name: `${node.name}/${child.name}`,
          path: child.path,
          children: child.children,
        };
      }
      return { ...node, children: compress(node.children) };
    });
  };
  return compress(root);
}

/** Map a PR file status to its accent color (added/removed/renamed/modified). */
export function fileStatusColor(status: string): string {
  switch (status) {
    case "added":
    case "copied":
      return "#5cb572";
    case "removed":
    case "deleted":
      return "#f14d4c";
    case "renamed":
      return "#4fc3f7";
    default:
      return "#cda629";
  }
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
  // Only the task's own PR — the workspace PR is the aggregate and isn't shown here.
  const refs = [task.pr].filter(Boolean);
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

function RepoGroupPill({ repo, pills, active, onClick }: { repo: string; pills: RepoPill[]; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2 rounded-md border px-2.5 transition-colors"
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
      <span>{repo}</span>
      {pills.map((pill, i) => {
        const prMeta = pill.prStatus ? PR_STATUS_META[pill.prStatus] : null;
        return (
          <span key={pill.pr ?? i} className="flex items-center gap-1.5">
            <span style={{ color: "#3c3c3c" }}>·</span>
            {pill.pr != null && <span style={{ color: active ? "#4fc3f7" : "#6e6e6e" }}>#{pill.pr}</span>}
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
          </span>
        );
      })}
    </button>
  );
}

/** Recursive node in the changed-files tree sidebar. */
function FileTreeNode({ node, depth, activeFile, onSelect }: { node: DiffTreeNode; depth: number; activeFile: string | null; onSelect: (path: string) => void }) {
  const [open, setOpen] = useState(true);
  const indent = 6 + depth * 12;

  if (node.kind === "dir") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={node.path}
          className="flex w-full items-center gap-1 py-1 pr-2 text-left transition-colors hover:bg-[#2a2d2e]"
          style={{ paddingLeft: indent, fontSize: 12, color: "#cccccc" }}
        >
          {open ? <ChevronDown size={13} style={{ color: "#858585", flexShrink: 0 }} /> : <ChevronRight size={13} style={{ color: "#858585", flexShrink: 0 }} />}
          <Folder size={13} style={{ color: "#7aa6da", flexShrink: 0 }} />
          <span className="min-w-0 truncate">{node.name}</span>
        </button>
        {open && node.children.map((child) => <FileTreeNode key={child.path} node={child} depth={depth + 1} activeFile={activeFile} onSelect={onSelect} />)}
      </>
    );
  }

  const active = node.path === activeFile;
  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className="flex w-full items-center gap-1.5 py-1 pr-2 text-left transition-colors hover:bg-[#2a2d2e]"
      style={{
        paddingLeft: indent + 13,
        fontSize: 12,
        color: active ? "#ffffff" : "#cccccc",
        backgroundColor: active ? "#37373d" : undefined,
      }}
      title={node.path}
    >
      <File size={13} style={{ color: fileStatusColor(node.file.status), flexShrink: 0 }} />
      <span className="min-w-0 truncate">{node.name}</span>
    </button>
  );
}

const DIFF_FONT = "JetBrains Mono, monospace";

/** Render a single line of code with Prism syntax highlighting, inline and transparent. */
function HighlightedLine({ text, language }: { text: string; language: string }) {
  if (text === "") return null;
  return (
    <SyntaxHighlighter
      language={language}
      style={vscDarkPlus}
      PreTag="span"
      CodeTag="span"
      customStyle={{
        margin: 0,
        padding: 0,
        background: "transparent",
        fontSize: 12,
        lineHeight: "20px",
        whiteSpace: "pre",
        display: "inline",
      }}
      codeTagProps={{
        style: {
          fontFamily: DIFF_FONT,
          fontSize: 12,
          lineHeight: "20px",
          background: "transparent",
        },
      }}
    >
      {text}
    </SyntaxHighlighter>
  );
}

const DiffRow = memo(function DiffRow({ line, language }: { line: DiffLine; language: string | null }) {
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
          fontFamily: DIFF_FONT,
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
          fontFamily: DIFF_FONT,
          color: colors.text,
          whiteSpace: "pre",
        }}
      >
        <span style={{ opacity: 0.5, marginRight: 8 }}>{prefix}</span>
        {language ? <HighlightedLine text={line.text} language={language} /> : line.text}
      </div>
    </div>
  );
});

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
        <MarkdownContent content={entry.body} className="review-thread-md" />
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
            <MarkdownContent content={entry.body} className="review-thread-md" />
          </div>
        )}
      </div>
    </div>
  );
}

/** Dropdown to jump to another task in the same feature. */
function TaskPickerPopover({ tasks, currentTaskId, onSelect, onClose }: { tasks: TaskSummary[]; currentTaskId: string; onSelect: (task: TaskSummary) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => `${t.task_name ?? ""} ${t.title ?? ""}`.toLowerCase().includes(q));
  }, [tasks, query]);

  return (
    <>
      {/* click-outside backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        role="listbox"
        className="absolute left-0 top-full z-50 mt-1 flex max-h-80 w-80 flex-col overflow-hidden rounded-lg border shadow-xl"
        style={{ borderColor: "#3c3c3c", backgroundColor: "#252526" }}
      >
        <div className="shrink-0 border-b p-2" style={{ borderColor: "#3c3c3c" }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a task…"
            className="w-full rounded border bg-transparent px-2 py-1 outline-none placeholder:text-[#6e6e6e] focus:border-[#4fc3f7]"
            style={{ fontSize: 12, color: "#cccccc", borderColor: "#3c3c3c" }}
          />
        </div>
        <div className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: "none" }}>
          {filtered.length === 0 ? (
            <p className="px-3 py-2" style={{ fontSize: 11, color: "#6e6e6e" }}>
              No tasks found.
            </p>
          ) : (
            filtered.map((t) => {
              const active = t.id === currentTaskId;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onClose();
                    if (!active) onSelect(t);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-[#2a2d2e]"
                  style={{ backgroundColor: active ? "#37373d" : undefined }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#4fc3f7",
                      fontFamily: "JetBrains Mono, monospace",
                      flexShrink: 0,
                    }}
                  >
                    {(t.task_name ?? t.task_id ?? t.id.slice(0, 8)).toUpperCase()}
                  </span>
                  <span
                    className="truncate"
                    style={{
                      fontSize: 12,
                      color: active ? "#ffffff" : "#cccccc",
                    }}
                  >
                    {t.title ?? t.task_name}
                  </span>
                  <span className="ml-auto shrink-0">
                    <StatusBadge status={t.status} />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

interface TaskReviewViewProps {
  task: TaskSummary;
}

export function TaskReviewView({ task }: TaskReviewViewProps) {
  const { selectedWorkspaceId, activeWorkspace } = useWorkspaceContext();

  const basePills = useMemo(() => buildRepoPills(task), [task]);
  const [activeRepo, setActiveRepo] = useState(() => basePills[0]?.repo ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);

  // Sibling tasks (same feature) for the header task picker, ordered by name.
  const siblingTasks = useMemo(() => {
    const all = activeWorkspace?.tasks ?? [];
    const scoped = task.feature_id ? all.filter((t) => t.feature_id === task.feature_id) : all;
    return [...scoped].sort((a, b) =>
      (a.task_name ?? "").localeCompare(b.task_name ?? "", undefined, {
        numeric: true,
      }),
    );
  }, [activeWorkspace?.tasks, task.feature_id]);

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

  // Pills are per-PR, so several can share one repo — group them so each repo renders once.
  const repoGroups = useMemo(() => {
    const map = new Map<string, RepoPill[]>();
    for (const r of repos) {
      const arr = map.get(r.repo) ?? [];
      arr.push(r);
      map.set(r.repo, arr);
    }
    return [...map.entries()].map(([repo, pills]) => ({ repo, pills }));
  }, [repos]);
  const repoCount = repoGroups.length;
  const currentRepo = repos.find((r) => r.repo === activeRepo) ?? repos[0];
  const prMeta = currentRepo?.prStatus ? PR_STATUS_META[currentRepo.prStatus] : null;
  const router = useRouter();
  const taskId = task.task_name?.toUpperCase() ?? task.task_id?.toUpperCase() ?? task.id.slice(0, 8).toUpperCase();
  const assigneeName = task.execution?.last_updated_by ?? "agent-reviewer";

  const goBack = () => {
    if (task.feature_id) router.push(`/feature/${encodeURIComponent(task.feature_id)}`);
    else router.back();
  };

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
          <button type="button" onClick={goBack} aria-label="Back" className="cursor-pointer shrink-0 text-text-muted transition-colors hover:text-text-primary">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="relative flex min-w-0 items-center">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              className="flex min-w-0 items-center gap-2.5 rounded px-1.5 py-1 transition-colors hover:bg-[#2a2d2e]"
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
              <span className="truncate" style={{ fontSize: 13, fontWeight: 500, color: "#d4d4d4" }}>
                {task.title ?? task.task_name}
              </span>
              <ChevronDown size={14} style={{ color: "#858585", flexShrink: 0 }} />
            </button>
            {pickerOpen && <TaskPickerPopover tasks={siblingTasks} currentTaskId={task.id} onClose={() => setPickerOpen(false)} onSelect={(t) => router.push(`/task/${encodeURIComponent(t.id)}`)} />}
          </div>
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
              {repoCount} {repoCount === 1 ? "repo" : "repos"}
            </span>
            <div className="shrink-0" style={{ width: 1, height: 14, backgroundColor: "#3c3c3c" }} />
            {repoGroups.map((g) => (
              <RepoGroupPill key={g.repo} repo={g.repo} pills={g.pills} active={g.repo === activeRepo} onClick={() => setActiveRepo(g.repo)} />
            ))}
            <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-3">
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
        )}

        <DiffPanel hasPr={hasPr} diffResult={diffResult} />
      </div>

      {/* ── Right: Review thread ── */}
      <div
        className="flex shrink-0 flex-col overflow-hidden border-l"
        style={{
          width: 520,
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

export interface DiffPanelProps {
  hasPr: boolean;
  diffResult: ReturnType<typeof useTaskDiff>;
}

export function DiffPanel({ hasPr, diffResult }: DiffPanelProps) {
  const [filter, setFilter] = useState("");
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const fileRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const files = useMemo(() => diffResult.data?.files ?? [], [diffResult.data]);
  const visibleFiles = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? files.filter((f) => f.filename.toLowerCase().includes(q)) : files;
  }, [files, filter]);
  const tree = useMemo(() => buildFileTree(visibleFiles), [visibleFiles]);

  const scrollToFile = (path: string) => {
    setActiveFile(path);
    fileRefs.current.get(path)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  if (files.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ backgroundColor: "#1e1e1e" }}>
        <p style={{ fontSize: 12, color: "#858585" }}>No changes in this pull request.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
      {/* ── Changed-files tree ── */}
      <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r" style={{ borderColor: "#3c3c3c", backgroundColor: "#252526" }}>
        <div className="shrink-0 border-b px-3 py-2.5" style={{ borderColor: "#3c3c3c" }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files…"
            className="w-full rounded border bg-transparent px-2 py-1 outline-none placeholder:text-[#6e6e6e] focus:border-[#4fc3f7]"
            style={{ fontSize: 12, color: "#cccccc", borderColor: "#3c3c3c" }}
          />
        </div>
        <div className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: "none" }}>
          {tree.length > 0 ? (
            tree.map((node) => <FileTreeNode key={node.path} node={node} depth={0} activeFile={activeFile} onSelect={scrollToFile} />)
          ) : (
            <p className="px-3 py-2" style={{ fontSize: 11, color: "#6e6e6e" }}>
              No files match.
            </p>
          )}
        </div>
      </aside>

      {/* ── File diffs ── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {visibleFiles.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <File size={28} style={{ color: "#3c3c3c" }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: "#cccccc" }}>No files match “{filter.trim()}”</p>
            <p style={{ fontSize: 12, color: "#6e6e6e" }}>Try a different search, or clear the filter to see all {files.length} changed files.</p>
            <button
              type="button"
              onClick={() => setFilter("")}
              className="mt-1 rounded border px-3 py-1 transition-colors hover:bg-[#2a2d2e]"
              style={{ fontSize: 12, color: "#4fc3f7", borderColor: "#3c3c3c" }}
            >
              Clear filter
            </button>
          </div>
        ) : (
          visibleFiles.map((file) => {
            const diffLines = parsePatch(file.patch);
            const language = languageFromFilename(file.filename);
            return (
              <div
                key={file.filename}
                ref={(el) => {
                  if (el) fileRefs.current.set(file.filename, el);
                  else fileRefs.current.delete(file.filename);
                }}
                className="mx-5 my-3 overflow-hidden rounded-lg border"
                style={{ borderColor: "#3c3c3c", scrollMarginTop: 12 }}
              >
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
                  <span
                    style={{
                      fontSize: 10,
                      color: "#f14d4c",
                      whiteSpace: "nowrap",
                    }}
                  >
                    -{file.deletions}
                  </span>
                </div>
                {diffLines.length > 0 ? (
                  diffLines.map((line, i) => <DiffRow key={i} line={line} language={language} />)
                ) : (
                  <div className="px-3 py-2" style={{ fontSize: 11, color: "#6e6e6e" }}>
                    Binary or empty diff
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export interface SpecPanelProps {
  task: TaskSummary;
}

export function SpecPanel({ task }: SpecPanelProps) {
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

export interface ThreadPanelProps {
  hasPr: boolean;
  threadResult: ReturnType<typeof useTaskReviewThread>;
  threadEntries: ThreadEntry[];
  currentRepo: RepoPill | undefined;
}

export function ThreadPanel({ hasPr, threadResult, threadEntries, currentRepo }: ThreadPanelProps) {
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
