"use client";

import { GitBranch, GitPullRequest } from "lucide-react";
import { useState } from "react";

import type { TaskSummary } from "@/services/workflow-backend/types";

type DiffLine = { kind: "add" | "remove" | "context"; num: number; text: string };
type PrStatus = "open" | "in_review" | "review_passed" | "changes_requested" | "merged";

interface RepoPill {
  repo: string;
  branch: string;
  pr?: number;
  prStatus?: PrStatus;
  additions: number;
  deletions: number;
}

const DIFF_COLORS = {
  add: { bg: "rgba(69,177,100,0.12)", text: "#5cb572", gutter: "rgba(69,177,100,0.25)" },
  remove: { bg: "rgba(241,77,76,0.12)", text: "#f14d4c", gutter: "rgba(241,77,76,0.25)" },
  context: { bg: "transparent", text: "#cccccc", gutter: "#333333" },
};

const PR_STATUS_META: Record<PrStatus, { label: string; color: string; bg: string }> = {
  open: { label: "Open", color: "oklch(0.72 0.13 230)", bg: "oklch(0.72 0.13 230 / 0.15)" },
  in_review: { label: "In Review", color: "#cda629", bg: "rgba(205,166,41,0.15)" },
  review_passed: { label: "Review Passed", color: "#5cb572", bg: "rgba(92,181,114,0.15)" },
  changes_requested: { label: "Changes Requested", color: "oklch(0.70 0.16 30)", bg: "oklch(0.70 0.16 30 / 0.15)" },
  merged: { label: "Merged", color: "#5cb572", bg: "rgba(92,181,114,0.15)" },
};

const PLACEHOLDER_DIFF: DiffLine[] = [
  { kind: "context", num: 1, text: 'import { Router } from "express";' },
  { kind: "context", num: 2, text: 'import { db } from "../db";' },
  { kind: "add", num: 3, text: 'import { SessionStore } from "../session/store";' },
  { kind: "context", num: 4, text: "" },
  { kind: "context", num: 5, text: "export const sessionRouter = Router();" },
  { kind: "context", num: 6, text: "" },
  { kind: "remove", num: 7, text: 'sessionRouter.get("/", async (req, res) => {' },
  { kind: "add", num: 7, text: 'sessionRouter.get("/", requireAuth, async (req, res) => {' },
  { kind: "context", num: 8, text: "  const sessions = await SessionStore.list(req.user.id);" },
  { kind: "context", num: 9, text: "  res.json({ sessions });" },
  { kind: "context", num: 10, text: "});" },
  { kind: "add", num: 11, text: "" },
  { kind: "add", num: 12, text: 'sessionRouter.post("/", requireAuth, async (req, res) => {' },
  { kind: "add", num: 13, text: "  const session = await SessionStore.create(req.user.id, req.body);" },
  { kind: "add", num: 14, text: "  res.status(201).json({ session });" },
  { kind: "add", num: 15, text: "});" },
];

function initials(name: string) {
  return name
    .split(/[-_ ]/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function parsePrNumber(url?: string | null): number | undefined {
  if (!url) return undefined;
  const m = url.match(/\/pull\/(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
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
      });
    });
  } else {
    pills.push({ repo: task.repo ?? "repo", branch: task.branch, additions: 0, deletions: 0 });
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
    in_review: { color: "#cda629", bg: "rgba(205,166,41,0.15)", label: "In Review" },
    reviewing: { color: "#cda629", bg: "rgba(205,166,41,0.15)", label: "Reviewing" },
    review_passed: { color: "#5cb572", bg: "rgba(92,181,114,0.15)", label: "Review Passed" },
    in_progress: { color: "#4fc3f7", bg: "rgba(79,195,247,0.15)", label: "In Progress" },
    done: { color: "#5cb572", bg: "rgba(92,181,114,0.15)", label: "Done" },
    todo: { color: "#858585", bg: "rgba(133,133,133,0.15)", label: "Todo" },
    ready: { color: "#4fc3f7", bg: "rgba(79,195,247,0.15)", label: "Ready" },
    blocked: { color: "#f14d4c", bg: "rgba(241,77,76,0.15)", label: "Blocked" },
  };
  const meta = colorMap[status] ?? { color: "#858585", bg: "rgba(133,133,133,0.15)", label: status };
  const glyph = glyphMap[status] ?? "○";
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2" style={{ backgroundColor: meta.bg, color: meta.color, fontSize: 11, fontWeight: 500, height: 18, whiteSpace: "nowrap" }}>
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
        <span className="rounded px-1" style={{ fontSize: 9, fontWeight: 600, backgroundColor: prMeta.bg, color: prMeta.color }}>
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
      <div className="flex-1 px-3 py-0.5" style={{ fontSize: 12, lineHeight: "20px", fontFamily: "JetBrains Mono, monospace", color: colors.text, whiteSpace: "pre" }}>
        <span style={{ opacity: 0.5, marginRight: 8 }}>{prefix}</span>
        {line.text}
      </div>
    </div>
  );
}

interface TaskReviewViewProps {
  task: TaskSummary;
}

export function TaskReviewView({ task }: TaskReviewViewProps) {
  const repos = buildRepoPills(task);
  const [activeRepo, setActiveRepo] = useState(repos[0]?.repo ?? "");

  const currentRepo = repos.find((r) => r.repo === activeRepo) ?? repos[0];
  const prMeta = currentRepo?.prStatus ? PR_STATUS_META[currentRepo.prStatus] : null;
  const taskId = task.task_name?.toUpperCase() ?? task.id.slice(0, 8).toUpperCase();
  const assigneeName = task.execution?.last_updated_by ?? "agent-reviewer";

  return (
    <div className="flex h-full overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
      {/* ── Left: Diff ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Task header */}
        <div className="flex shrink-0 items-center gap-2.5 border-b px-5" style={{ height: 52, borderColor: "#3c3c3c", backgroundColor: "#252526" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#4fc3f7", fontFamily: "JetBrains Mono, monospace" }}>{taskId}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#d4d4d4" }}>{task.title ?? task.task_name}</span>
          <StatusBadge status={task.status} />
          <div className="flex-1" />
          <AgentAvatar name={assigneeName} size={20} />
          <span style={{ fontSize: 11, color: "#858585" }}>{assigneeName}</span>
        </div>

        {/* Repo selector bar */}
        {repos.length > 0 && (
          <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b px-5" style={{ height: 44, borderColor: "#3c3c3c", backgroundColor: "#1e1e1e", scrollbarWidth: "none" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#6e6e6e", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
              {repos.length} {repos.length === 1 ? "repo" : "repos"}
            </span>
            <div className="shrink-0" style={{ width: 1, height: 14, backgroundColor: "#3c3c3c" }} />
            {repos.map((r, i) => (
              <RepoPillBtn key={`${r.repo}-${r.pr ?? i}`} pill={r} active={r.repo === activeRepo} onClick={() => setActiveRepo(r.repo)} />
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex shrink-0 items-center border-b" style={{ height: 36, borderColor: "#3c3c3c", backgroundColor: "#252526" }}>
          {["Diff", "Spec"].map((tab, i) => (
            <button
              key={tab}
              type="button"
              className="border-r px-4"
              style={{
                height: 36,
                borderColor: "#3c3c3c",
                fontSize: 12,
                fontWeight: 500,
                color: i === 0 ? "#d4d4d4" : "#858585",
                borderBottom: i === 0 ? "2px solid #007acc" : "2px solid transparent",
                backgroundColor: i === 0 ? "#1e1e1e" : "#252526",
              }}
            >
              {tab}
            </button>
          ))}
          <div className="flex flex-1 items-center justify-end px-4">
            <div className="flex items-center gap-1.5">
              <GitBranch size={12} style={{ color: "#858585" }} />
              <span style={{ fontSize: 11, color: "#858585", fontFamily: "JetBrains Mono, monospace" }}>{currentRepo?.branch ?? task.branch}</span>
            </div>
          </div>
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#1e1e1e", scrollbarWidth: "none" }}>
          <div className="mx-5 my-3 overflow-hidden rounded-lg border" style={{ borderColor: "#3c3c3c" }}>
            {/* File header */}
            <div className="flex items-center gap-2.5 border-b px-3 py-2" style={{ borderColor: "#3c3c3c", backgroundColor: "#252526" }}>
              <span style={{ fontSize: 11, color: "#858585", fontFamily: "JetBrains Mono, monospace" }}>src/routes/sessions.ts</span>
              {currentRepo && (currentRepo.additions > 0 || currentRepo.deletions > 0) && (
                <>
                  <span style={{ fontSize: 10, color: "#5cb572", marginLeft: "auto" }}>+{currentRepo.additions}</span>
                  <span style={{ fontSize: 10, color: "#f14d4c" }}>-{currentRepo.deletions}</span>
                </>
              )}
            </div>
            {PLACEHOLDER_DIFF.map((line, i) => (
              <DiffRow key={i} line={line} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Review thread ── */}
      <div className="flex shrink-0 flex-col overflow-hidden border-l" style={{ width: 400, borderColor: "#3c3c3c", backgroundColor: "#252526" }}>
        {/* Header */}
        <div className="flex shrink-0 items-center border-b px-4" style={{ height: 52, borderColor: "#3c3c3c" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d4" }}>Review Thread</span>
          {currentRepo?.pr != null && (
            <div className="ml-auto flex items-center gap-1.5">
              <GitPullRequest size={12} style={{ color: "#858585" }} />
              <span style={{ fontSize: 12, color: "#858585", fontFamily: "JetBrains Mono, monospace" }}>#{currentRepo.pr}</span>
              {prMeta && (
                <span className="inline-flex items-center rounded px-1.5" style={{ fontSize: 10, fontWeight: 600, backgroundColor: prMeta.bg, color: prMeta.color, height: 18 }}>
                  {prMeta.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Thread body */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" style={{ scrollbarWidth: "none" }}>
          {/* Reviewer comment */}
          <div className="flex items-start gap-2.5">
            <AgentAvatar name={assigneeName} size={24} />
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-1.5">
                <span style={{ fontSize: 12, fontWeight: 500, color: "#d4d4d4" }}>{assigneeName}</span>
                <span className="inline-flex items-center rounded px-1.5" style={{ fontSize: 10, fontWeight: 600, backgroundColor: "rgba(92,181,114,0.2)", color: "#5cb572", height: 18 }}>
                  ✓ APPROVED
                </span>
              </div>
              <div className="rounded-lg border p-3" style={{ backgroundColor: "#2d2d2d", borderColor: "#3c3c3c" }}>
                <p style={{ fontSize: 12, color: "#cccccc", lineHeight: 1.6 }}>
                  Auth middleware addition is correct. Endpoint shape matches the agreed API contract. Minor: consider extracting{" "}
                  <code style={{ fontFamily: "JetBrains Mono, monospace", color: "#4fc3f7", fontSize: 11 }}>requireAuth</code> import to a shared middleware barrel.
                </p>
              </div>
            </div>
          </div>

          {/* Inline comment */}
          <div className="ml-8 rounded-lg border p-3" style={{ backgroundColor: "#2d2d2d", borderColor: "#333333" }}>
            <div className="mb-1.5 flex items-center gap-2">
              <span style={{ fontSize: 10, color: "#858585", fontFamily: "JetBrains Mono, monospace" }}>sessions.ts:7</span>
            </div>
            <p style={{ fontSize: 12, color: "#cccccc", lineHeight: 1.5 }}>Good catch adding auth here — T2's persistence layer will depend on this being in place first.</p>
          </div>

          {/* Action card */}
          <div className="mt-2 rounded-lg border p-4" style={{ backgroundColor: "#2d2d2d", borderColor: "rgba(0,122,204,0.4)" }}>
            <p style={{ fontSize: 12, color: "#cccccc", marginBottom: 12, lineHeight: 1.5 }}>
              Review passed. PR #{currentRepo?.pr ?? "—"} is ready to merge into <code style={{ fontFamily: "JetBrains Mono, monospace", color: "#4fc3f7", fontSize: 11 }}>main</code>.
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className="flex items-center gap-1.5 rounded-md px-4" style={{ height: 34, backgroundColor: "#007acc", color: "#fff", fontSize: 13, fontWeight: 600 }}>
                <GitBranch size={14} />
                Merge PR #{currentRepo?.pr ?? ""}
              </button>
              <button type="button" className="rounded-md border px-3" style={{ height: 34, borderColor: "#6e6e6e", color: "#cccccc", fontSize: 12 }}>
                Request changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
