"use client";

import { Bot, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ThreadMember } from "./types";

type MentionPickerProps = {
  query: string;
  members: ThreadMember[];
  onSelect: (member: ThreadMember) => void;
  onClose: () => void;
};

function filterMembers(members: ThreadMember[], query: string): ThreadMember[] {
  if (!query) return members;
  const normalized = query.toLowerCase();
  return members.filter((m) => m.handle.toLowerCase().includes(normalized) || m.name.toLowerCase().includes(normalized));
}

export function MentionPicker({ query, members, onSelect, onClose }: MentionPickerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = filterMembers(members, query);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, filtered.length]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((i) => (i + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        if (filtered[activeIndex]) {
          onSelect(filtered[activeIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [filtered, activeIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div data-mention-picker role="listbox" aria-label="Mention someone" className="absolute bottom-full left-3 right-3 z-50 mb-1 overflow-hidden rounded-md border border-border bg-surface shadow-md">
      <ul ref={listRef} className="max-h-48 overflow-y-auto py-1">
        {filtered.map((member, idx) => (
          <li
            key={member.id}
            role="option"
            aria-selected={idx === activeIndex}
            data-mention-item
            data-active={idx === activeIndex}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(member);
            }}
            onMouseEnter={() => setActiveIndex(idx)}
            className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors ${idx === activeIndex ? "bg-primary/10 text-text-primary" : "text-text-primary hover:bg-surface-subtle"}`}
          >
            {member.kind === "agent" ? (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-3 w-3 text-primary" aria-hidden="true" />
              </div>
            ) : member.avatarUrl ? (
              <img src={member.avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
                <User className="h-3 w-3 text-text-muted" aria-hidden="true" />
              </div>
            )}
            <span className="flex min-w-0 flex-1 items-baseline gap-1 truncate">
              <span className="font-medium">{member.name}</span>
              <span className="text-xs text-text-muted">@{member.handle}</span>
            </span>
            {member.roleLabel && <span className="shrink-0 text-[10px] text-text-muted">{member.roleLabel}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Detect if the text up to `caretPos` ends with an active `@query`. */
export function detectMention(value: string, caretPos: number): { query: string; atIndex: number } | null {
  const textBeforeCaret = value.slice(0, caretPos);
  const match = textBeforeCaret.match(/@([a-zA-Z0-9_-]*)$/);
  if (!match) return null;
  const atIndex = textBeforeCaret.lastIndexOf("@");
  return { query: match[1], atIndex };
}

/** Replace the `@query` at `atIndex` in `value` with `@{handle} `. */
export function insertMention(value: string, atIndex: number, query: string, handle: string): string {
  const before = value.slice(0, atIndex);
  const after = value.slice(atIndex + 1 + query.length);
  // Skip the extra space if the remaining text already starts with one.
  const sep = after.startsWith(" ") ? "" : " ";
  return `${before}@${handle}${sep}${after}`;
}
