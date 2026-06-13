"use client";

import { useEffect, useRef, useState } from "react";

import { listTools } from "@/services/hermes-agent/tools";

type SlashCommand = {
  name: string;
  hint: string;
};

function toolNameToSlash(name: string): string {
  return "/" + name.replace(/_/g, "-");
}

type SlashCommandPickerProps = {
  query: string;
  onSelect: (command: string) => void;
  onClose: () => void;
};

function filterCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  if (!query) return [];
  const normalized = query.toLowerCase();
  return commands.filter((c) => c.name.includes(normalized));
}

export function SlashCommandPicker({ query, onSelect, onClose }: SlashCommandPickerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [commands, setCommands] = useState<SlashCommand[]>([]);
  const listRef = useRef<HTMLUListElement>(null);

  // Fetch live tools list from hermes
  useEffect(() => {
    let cancelled = false;
    listTools()
      .then((tools) => {
        if (cancelled) return;
        setCommands(tools.map((t) => ({ name: toolNameToSlash(t.name), hint: t.description })).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {
        // On error keep empty — picker simply shows nothing
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = filterCommands(commands, query);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep the highlighted command scrolled into view as the user arrows through.
  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, filtered.length]);

  // Keyboard handler attached to document — picks up events while picker is open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
      } else if (e.key === "Enter" || e.key === "Tab") {
        // Tab autocompletes the highlighted command into the input, just like Enter.
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
      className="absolute bottom-full left-3 right-3 z-50 mb-1 overflow-hidden rounded-md border border-border bg-surface shadow-md"
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
            className={`flex cursor-pointer flex-col px-3 py-2 text-sm transition-colors ${idx === activeIndex ? "bg-primary/10 text-text-primary" : "text-text-primary hover:bg-surface-subtle"}`}
          >
            <span className="font-mono font-medium">{cmd.name}</span>
            <span className="text-xs text-text-muted">{cmd.hint}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
