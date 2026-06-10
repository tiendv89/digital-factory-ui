"use client";

import React from "react";

import { cn } from "./cn";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Optional tone for the label (e.g. danger zone). */
  tone?: "default" | "danger";
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Horizontal underline tabs (workspace settings). */
export function Tabs({ items, active, onChange, className }: TabsProps) {
  return (
    <nav role="tablist" className={cn("flex gap-1 border-b border-border", className)}>
      {items.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
              isActive ? "border-primary text-text-primary" : "border-transparent text-text-muted hover:text-text-secondary",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

/** Vertical sidebar tabs (org settings / settings page). */
export function SidebarTabs({ items, active, onChange, className }: TabsProps) {
  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {items.map((tab) => {
        const isActive = tab.id === active;
        const danger = tab.tone === "danger";
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-left text-sm transition-colors",
              isActive ? "bg-nav-item-active text-text-primary" : danger ? "text-danger hover:bg-surface-secondary" : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
