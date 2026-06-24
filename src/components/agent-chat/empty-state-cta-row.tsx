"use client";

import { useEffect, useState } from "react";

import { getWorkspaceCapabilities } from "@/services/hermes-agent/chat";

import { CTACard } from "./cta-card";
import type { CtaSuggestion, WorkspaceCapabilities } from "./types";

type FeatureLifecycleStatus = string;

function lifecycleStarterCards(status: FeatureLifecycleStatus | null | undefined): CtaSuggestion[] {
  switch (status) {
    case "in_design":
      return [
        {
          id: "starter-write-spec",
          title: "Write product spec",
          category: "Lifecycle",
          description: "Draft the product spec for this feature with the agent.",
          action_text: "/write-product-spec",
          button_label: "Write spec",
          icon: "📝",
        },
        {
          id: "starter-approve-spec",
          title: "Approve product spec",
          category: "Lifecycle",
          description: "Mark the spec approved and advance to technical design.",
          action_text: "/approve-product-spec",
          button_label: "Approve",
          icon: "✅",
        },
        {
          id: "starter-revise-spec",
          title: "Revise product spec",
          category: "Lifecycle",
          description: "Ask the agent to update the existing draft.",
          action_text: "/revise-product-spec",
          button_label: "Revise",
          icon: "✏️",
        },
      ];
    case "in_tdd":
      return [
        {
          id: "starter-write-design",
          title: "Write technical design",
          category: "Lifecycle",
          description: "Draft the technical design document for this feature.",
          action_text: "/write-technical-design",
          button_label: "Write design",
          icon: "🏗️",
        },
        {
          id: "starter-approve-design",
          title: "Approve technical design",
          category: "Lifecycle",
          description: "Mark the design approved and generate the task breakdown.",
          action_text: "/approve-technical-design",
          button_label: "Approve",
          icon: "✅",
        },
      ];
    case "ready_for_implementation":
      return [
        {
          id: "starter-generate-tasks",
          title: "Generate task breakdown",
          category: "Lifecycle",
          description: "Have the agent generate the implementation task breakdown.",
          action_text: "/generate-task-breakdown",
          button_label: "Generate tasks",
          icon: "📋",
        },
      ];
    case "in_implementation":
      return [
        {
          id: "starter-check-tasks",
          title: "Check task status",
          category: "Lifecycle",
          description: "Get a summary of the current implementation task statuses.",
          action_text: "/check-task-status",
          button_label: "Check status",
          icon: "📊",
        },
        {
          id: "starter-review-pr",
          title: "Review a PR",
          category: "Lifecycle",
          description: "Review an open pull request for this feature.",
          action_text: "/review-pr",
          button_label: "Review PR",
          icon: "🔍",
        },
      ];
    default:
      return [];
  }
}

function capabilityStarterCards(capabilities: WorkspaceCapabilities): CtaSuggestion[] {
  const cards: CtaSuggestion[] = [];
  if (capabilities.gitnexus) {
    cards.push({
      id: "starter-gitnexus",
      title: "Search codebase",
      category: "GitNexus",
      description: "Find relevant code or symbols before starting design.",
      action_text: "Search the codebase for ...",
      button_label: "Search",
      icon: "🔭",
    });
  }
  if (capabilities.rag) {
    cards.push({
      id: "starter-rag",
      title: "Query knowledge base",
      category: "RAG",
      description: "Search indexed docs and prior decisions for context.",
      action_text: "Search the knowledge base for ...",
      button_label: "Query",
      icon: "📚",
    });
  }
  return cards;
}

type EmptyStateCTARowProps = {
  featureStatus?: FeatureLifecycleStatus | null;
  onAction: (actionText: string) => void;
  dismissed?: boolean;
};

export function EmptyStateCTARow({ featureStatus, onAction, dismissed = false }: EmptyStateCTARowProps) {
  const [capabilities, setCapabilities] = useState<WorkspaceCapabilities>({
    gitnexus: false,
    rag: false,
  });

  useEffect(() => {
    void getWorkspaceCapabilities().then(setCapabilities);
  }, []);

  if (dismissed) return null;

  const lifecycleCards = lifecycleStarterCards(featureStatus);
  const capCards = capabilityStarterCards(capabilities);
  const allCards = [...lifecycleCards, ...capCards].slice(0, 4);

  if (allCards.length === 0) return null;

  return (
    <div data-empty-state-cta-row className="flex flex-row flex-wrap gap-2" role="group" aria-label="Suggested actions to get started">
      {allCards.map((s) => (
        <CTACard key={s.id} suggestion={s} active={true} onAction={onAction} />
      ))}
    </div>
  );
}

export { capabilityStarterCards, lifecycleStarterCards };
