"use client";

/**
 * T6 Browser QA Test Page
 *
 * Renders key components in isolation with mock data so Playwright can
 * verify DOM structure, capture screenshots, and confirm regression fixes.
 *
 * Route: /test/board-qa
 */
import React from "react";
import { FeatureListRow } from "@/features/board/components/FeatureBoardView/FeatureListRow";
import { TaskCard } from "@/features/board/components/TaskCard/TaskCard";
import { FeatureRow } from "@/features/board/components/FeatureRow/FeatureRow";
import { FeatureTasksPanel } from "@/features/board/components/FeatureTabView/FeatureTasksPanel";
import { PaginationControls } from "@/features/board/components/PaginationControls/PaginationControls";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import type {
  FeatureDetail,
  FeatureDocument,
  TaskSummary,
} from "@/services/workflow-backend/types";

// ═══════════════════════════════════════════════════════════════════════
// Mock data
// ═══════════════════════════════════════════════════════════════════════

const mockFeature: ParsedFeature = {
  id: "kanban-board-feature",
  title: "Feature Kanban Board",
  featureStatus: "in_implementation",
  tasks: [
    { id: "T1", title: "Implement pagination", status: "done", dependsOn: [] },
    { id: "T2", title: "Build card layout", status: "in_progress", dependsOn: [] },
    { id: "T3", title: "Write tests", status: "ready", dependsOn: ["T1"] },
  ],
};

const mockFeatureLongId: ParsedFeature = {
  id: "very-long-feature-id-that-would-overflow-the-card",
  title: "Short Title",
  featureStatus: "in_implementation",
  tasks: [],
};

const mockFeatureLongTitle: ParsedFeature = {
  id: "SHORT-1",
  title:
    "This is a very long feature title that should wrap across multiple lines rather than being cut off abruptly by the card layout",
  featureStatus: "in_design",
  tasks: [],
};

const mockFeatureSameIdTitle: ParsedFeature = {
  id: "simple-feature",
  title: "simple-feature",
  featureStatus: "done",
  tasks: [],
};

const mockFeaturesForStatus: ParsedFeature[] = [
  { id: "feat-design", title: "Feature In Design", featureStatus: "in_design", tasks: [] },
  { id: "feat-tdd", title: "Feature In TDD", featureStatus: "in_tdd", tasks: [] },
  { id: "feat-ready", title: "Feature Ready", featureStatus: "ready_for_implementation", tasks: [] },
  { id: "feat-impl", title: "Feature In Progress", featureStatus: "in_implementation", tasks: [] },
  { id: "feat-handoff", title: "Feature Handoff", featureStatus: "in_handoff", tasks: [] },
  { id: "feat-done", title: "Feature Done", featureStatus: "done", tasks: [] },
  { id: "feat-blocked", title: "Feature Blocked", featureStatus: "blocked", tasks: [] },
  { id: "feat-cancelled", title: "Feature Cancelled", featureStatus: "cancelled", tasks: [] },
];

const mockTask: ParsedTask = {
  id: "T1",
  title: "Implement API client with pagination support",
  status: "in_progress",
  dependsOn: [],
};

const mockTasksForStatus: ParsedTask[] = [
  { id: "T-done", title: "Done task", status: "done", dependsOn: [] },
  { id: "T-progress", title: "In progress task", status: "in_progress", dependsOn: [] },
  { id: "T-ready", title: "Ready task", status: "ready", dependsOn: [] },
  { id: "T-blocked", title: "Blocked task", status: "blocked", dependsOn: [] },
  { id: "T-todo", title: "Todo task", status: "todo", dependsOn: [] },
];

function makeTaskSummary(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "task-uuid-1",
    task_id: "T1",
    task_name: "T1",
    feature_id: "feat-uuid-1",
    feature_name: "kanban-board-feature",
    title: "Implement API client",
    status: "in_progress",
    repo: "digital-factory-ui",
    branch: "feature/T1",
    is_blocked: false,
    pr: null,
    workspace_pr: null,
    ...overrides,
  };
}

function makeDocument(overrides: Partial<FeatureDocument> = {}): FeatureDocument {
  return {
    document_type: "tasks",
    source_path: "docs/features/test/tasks.md",
    url: "https://github.com/acme/repo/blob/main/docs/features/test/tasks.md",
    ...overrides,
  };
}

const mockFeatureDetail: FeatureDetail = {
  id: "feat-uuid-1",
  feature_id: "feat-uuid-1",
  feature_name: "kanban-board-feature",
  title: "Feature Kanban Board",
  status: "in_implementation",
  current_stage: "in_implementation",
  stages: {},
  updated_at: "2026-05-20T10:30:00Z",
  task_counts: { total: 6, done: 4, in_progress: 1, blocked: 0, ready: 1, todo: 0 },
  workspace_id: "ws-uuid-1",
  documents: [
    makeDocument({
      document_type: "tasks",
      source_path: "docs/features/test/tasks.md",
      url: "https://github.com/acme/repo/blob/main/docs/features/test/tasks.md",
      content: `# Tasks

## T1 — Implement pagination

- Create pagination component
- Add page state management
- Wire up backend pagination

## T2 — Build card layout

- Feature card ID/title hierarchy
- Status-based column grouping
- Responsive breakpoints

## T3 — Write tests

- Unit tests for all components
- Browser QA verification
`,
    }),
  ],
  tasks: [
    makeTaskSummary({ task_name: "T1", title: "Implement pagination", status: "done" }),
    makeTaskSummary({ id: "task-uuid-2", task_id: "T2", task_name: "T2", title: "Build card layout", status: "in_progress" }),
    makeTaskSummary({ id: "task-uuid-3", task_id: "T3", task_name: "T3", title: "Write tests", status: "ready" }),
  ],
  source_state: { stale: false },
};

// ═══════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════

export default function BoardQATestPage() {
  return (
    <div className="min-h-screen bg-bg p-8 text-text-primary">
      <h1 className="mb-8 text-2xl font-bold">T6 Browser QA — Component Verification</h1>

      {/* Section 1: Feature Cards */}
      <section id="section-feature-cards" className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">1. Feature Cards — ID smaller than title</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="w-72">
            <p className="mb-2 text-xs text-text-muted">Normal — ID + Title</p>
            <FeatureListRow feature={mockFeature} onClick={() => {}} />
          </div>
          <div className="w-72">
            <p className="mb-2 text-xs text-text-muted">Long ID — truncates</p>
            <FeatureListRow feature={mockFeatureLongId} onClick={() => {}} />
          </div>
          <div className="w-72">
            <p className="mb-2 text-xs text-text-muted">Long Title — wraps (line-clamp-2)</p>
            <FeatureListRow feature={mockFeatureLongTitle} onClick={() => {}} />
          </div>
          <div className="w-72">
            <p className="mb-2 text-xs text-text-muted">Same ID/Title — ID hidden</p>
            <FeatureListRow feature={mockFeatureSameIdTitle} onClick={() => {}} />
          </div>
        </div>
      </section>

      {/* Section 2: Status tags suppressed in feature cards */}
      <section id="section-no-status-pill" className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">2. Feature Cards — No status pill</h2>
        <p className="mb-4 text-sm text-text-muted">
          All feature cards below should NOT contain status label badges (In Design, In Progress, etc.)
        </p>
        <div className="flex flex-wrap gap-4">
          {mockFeaturesForStatus.map((f) => (
            <div key={f.id} className="w-72">
              <p className="mb-2 text-xs text-text-muted">Status: {f.featureStatus}</p>
              <FeatureListRow feature={f} onClick={() => {}} />
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Feature Row — renders lifecycle status */}
      <section id="section-feature-row-status" className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">3. Feature Rows — Lifecycle status rendering</h2>
        <div className="space-y-2 max-w-2xl">
          {mockFeaturesForStatus.map((f) => (
            <FeatureRow
              key={f.id}
              feature={f}
              isExpanded={false}
              onToggle={() => {}}
              onOpenTaskTab={() => {}}
            />
          ))}
        </div>
      </section>

      {/* Section 4: Task Cards */}
      <section id="section-task-cards" className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">4. Task Cards — Tab-first click behavior</h2>
        <div className="flex flex-wrap gap-4">
          {mockTasksForStatus.map((t) => (
            <div key={t.id} className="w-56">
              <TaskCard
                task={t}
                featureId="feat-1"
                featureTitle="Feature"
                onOpenTab={() => {}}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Task Docs Panel */}
      <section id="section-task-docs" className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">5. Feature Tasks Panel — Tasks List & Task Docs</h2>
        <div className="border border-border">
          <FeatureTasksPanel feature={mockFeatureDetail} onOpenTaskTab={() => {}} />
        </div>
      </section>

      {/* Section 6: Pagination Controls */}
      <section id="section-pagination" className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">6. Pagination Controls</h2>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs text-text-muted">Page 1 of 5 (200 items)</p>
            <PaginationControls
              pageInfo={{ page: 1, limit: 50, total: 200 }}
              onPageChange={(p) => console.log("Page:", p)}
            />
          </div>
          <div>
            <p className="mb-2 text-xs text-text-muted">Page 3 of 5</p>
            <PaginationControls
              pageInfo={{ page: 3, limit: 50, total: 200 }}
              onPageChange={(p) => console.log("Page:", p)}
            />
          </div>
          <div>
            <p className="mb-2 text-xs text-text-muted">Single page</p>
            <PaginationControls
              pageInfo={{ page: 1, limit: 50, total: 3 }}
              onPageChange={(p) => console.log("Page:", p)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
