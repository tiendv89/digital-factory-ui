"use client";

import { useEffect, useRef, useState } from "react";

export type SlashCommand = {
  name: string;
  hint: string;
};

export const COMMANDS: SlashCommand[] = [
  { name: "/write-product-spec", hint: "Draft or update the product spec" },
  { name: "/write-technical-design", hint: "Draft or update the technical design" },
  { name: "/get-feature-state", hint: "Show current feature lifecycle state" },
  { name: "/get-workspace-context", hint: "Show repos, roles, model policy" },
];

type SlashCommandPickerProps = {
  query: string;
  onSelect: (command: string) => void;
  onClose: () => void;
};

export function filterCommands(query: string): SlashCommand[] {
  if (!query) return [];
  const normalized = query.toLowerCase();
  return COMMANDS.filter((c) => c.name.includes(normalized));
}

export function SlashCommandPicker({ query, onSelect, onClose }: SlashCommandPickerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = filterCommands(query);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keyboard handler attached to document — picks up events while picker is open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[activeIndex]) {
          onSelect(filtered[activeIndex].name);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [filtered, activeIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      data-slash-command-picker
      role="listbox"
      aria-label="Slash commands"
      className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-md border border-border bg-surface shadow-md"
    >
      <ul ref={listRef} className="max-h-48 overflow-y-auto py-1">
        {filtered.map((cmd, idx) => (
          <li
            key={cmd.name}
            role="option"
            aria-selected={idx === activeIndex}
            data-slash-command-item
            data-active={idx === activeIndex}
            onMouseDown={(e) => {
              // Prevent textarea blur before we can call onSelect
              e.preventDefault();
              onSelect(cmd.name);
            }}
            onMouseEnter={() => setActiveIndex(idx)}
            className={`flex cursor-pointer flex-col px-3 py-2 text-sm transition-colors ${
              idx === activeIndex
                ? "bg-primary/10 text-text-primary"
                : "text-text-primary hover:bg-surface-subtle"
            }`}
          >
            <span className="font-mono font-medium">{cmd.name}</span>
            <span className="text-xs text-text-muted">{cmd.hint}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
