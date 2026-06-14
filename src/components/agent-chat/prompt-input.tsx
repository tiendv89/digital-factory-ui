"use client";

import { ListBox, Select } from "@heroui/react";
import { Check, ChevronDown, Send, Zap } from "lucide-react";
import { type ChangeEvent, type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

import type { ModelOption } from "@/services/hermes-agent/chat";

import { detectMention, insertMention, MentionPicker } from "./mention-picker";
import type { ChatStatus, ThreadMember } from "./types";

type PromptInputTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  /** Previously sent prompts, newest first, for Up/Down recall. */
  history?: string[];
  /** Called when the textarea caret position changes so the parent can detect @-mention state. */
  onCaretChange?: (pos: number) => void;
};

function PromptInputTextarea({ value, onChange, onSubmit, disabled, placeholder = "Message the agent…", history = [], onCaretChange }: PromptInputTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // -1 means "not navigating history"; otherwise an index into `history`.
  const historyIndexRef = useRef(-1);
  // The in-progress text saved when history navigation begins, restored on the way back down.
  const draftRef = useRef("");
  // Set after a programmatic value change so we can place the caret once the new value lands.
  const pendingCaretRef = useRef<number | null>(null);

  const resize = () => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  };

  // Apply the caret position requested by a history recall, and resize for multi-line prompts.
  useEffect(() => {
    if (pendingCaretRef.current != null && ref.current) {
      const pos = pendingCaretRef.current;
      ref.current.setSelectionRange(pos, pos);
      pendingCaretRef.current = null;
      resize();
    }
    // The input was cleared externally (e.g. after submit) — leave history navigation.
    if (value === "") {
      historyIndexRef.current = -1;
      draftRef.current = "";
    }
  }, [value]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    // Manual edits exit history navigation.
    historyIndexRef.current = -1;
    onChange(e.target.value);
    onCaretChange?.(e.target.selectionStart ?? e.target.value.length);
    resize();
  }

  function recall(value: string) {
    pendingCaretRef.current = value.length;
    onChange(value);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        historyIndexRef.current = -1;
        onSubmit();
      }
      return;
    }

    // While composing a slash command the arrows belong to the command picker, not history.
    if (value.startsWith("/")) return;

    // CLI-style history recall: Up walks back through sent prompts when the caret is on the
    // first line, Down walks forward when it's on the last line. Otherwise the arrows move
    // the caret within a multi-line prompt as usual.
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    if (e.key === "ArrowUp" && history.length > 0 && !value.slice(0, caret).includes("\n")) {
      const next = Math.min(historyIndexRef.current + 1, history.length - 1);
      if (next === historyIndexRef.current) return;
      if (historyIndexRef.current === -1) draftRef.current = value;
      historyIndexRef.current = next;
      e.preventDefault();
      recall(history[next]);
    } else if (e.key === "ArrowDown" && historyIndexRef.current !== -1 && !value.slice(caret).includes("\n")) {
      const next = historyIndexRef.current - 1;
      e.preventDefault();
      if (next < 0) {
        historyIndexRef.current = -1;
        recall(draftRef.current);
      } else {
        historyIndexRef.current = next;
        recall(history[next]);
      }
    }
  }

  return (
    <textarea
      ref={ref}
      data-prompt-textarea
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onClick={() => onCaretChange?.(ref.current?.selectionStart ?? value.length)}
      disabled={disabled}
      placeholder={placeholder}
      rows={1}
      className="w-full resize-none bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      style={{ maxHeight: "120px", overflowY: "auto" }}
      aria-label="Message input"
    />
  );
}

type PromptInputSubmitProps = {
  disabled?: boolean;
  onClick: () => void;
};

function PromptInputSubmit({ disabled, onClick }: PromptInputSubmitProps) {
  return (
    <button
      type="submit"
      data-prompt-submit
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Send message"
    >
      <Send className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

type ModelPickerProps = {
  models: ModelOption[];
  selectedModel: string;
  onModelChange: (id: string) => void;
  disabled?: boolean;
};

// Per-provider brand icon (served from /public). Falls back to the Zap glyph
// for any provider without an asset.
const PROVIDER_ICON: Record<string, string> = {
  anthropic: "/images/model-provider/anthropic.svg",
  deepseek: "/images/model-provider/deepseek.svg",
};

// Section order + heading for the picker. Providers not listed here are appended
// after, each under its own (raw) heading.
const PROVIDER_SECTIONS: { provider: string; label: string }[] = [
  { provider: "anthropic", label: "Anthropic" },
  { provider: "deepseek", label: "DeepSeek" },
];

function ProviderIcon({ provider, size }: { provider: string; size: number }) {
  const src = PROVIDER_ICON[provider];
  if (!src) return <Zap className="shrink-0 text-accent-foreground" style={{ width: size, height: size }} aria-hidden="true" />;
  return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-[4px]" />;
}

/** Compact toolbar dropdown for choosing the chat model.
 *
 * Uses HeroUI's Select so the menu renders in a portaled popover — it can't be
 * clipped by the prompt container's `overflow-hidden`. The trigger is a
 * borderless pill (own inline ChevronDown, since the default Select.Indicator
 * is absolutely positioned and overlaps the value on a width-auto trigger), and
 * the popover/items are styled to match the org-workspace switcher menu.
 *
 * Models are grouped into per-provider sections. Section headings are rendered
 * as disabled ListBox items (react-aria's Section/Header aren't reachable
 * through HeroUI here), so they show as labels but can't be selected. */
function ModelPicker({ models, selectedModel, onModelChange, disabled }: ModelPickerProps) {
  const current = models.find((m) => m.id === selectedModel);

  // Build the provider groups present in the catalog: known order first, then
  // any extra providers in encounter order.
  const knownOrder = PROVIDER_SECTIONS.map((s) => s.provider);
  const groups = [
    ...PROVIDER_SECTIONS.filter((s) => models.some((m) => m.provider === s.provider)),
    ...Array.from(new Set(models.map((m) => m.provider)))
      .filter((p) => !knownOrder.includes(p))
      .map((p) => ({ provider: p, label: p })),
  ];

  const headerKey = (provider: string) => `__hdr_${provider}`;

  // Flat children array (headers + items); react-aria's collection builder wants
  // a flat list of ListBox.Item nodes, not fragments.
  const rows: React.ReactNode[] = [];
  for (const group of groups) {
    rows.push(
      <ListBox.Item
        key={headerKey(group.provider)}
        id={headerKey(group.provider)}
        textValue={group.label}
        className="pointer-events-none px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest opacity-100"
        style={{ color: "#9d9d9d" }}
      >
        {group.label}
      </ListBox.Item>,
    );
    for (const m of models.filter((x) => x.provider === group.provider)) {
      rows.push(
        <ListBox.Item
          key={m.id}
          id={m.id}
          textValue={m.label}
          className="flex cursor-pointer items-center justify-between gap-2.5 rounded-md px-3 py-2 text-[13px] text-text-primary outline-none transition-colors hover:bg-white/5 data-[focused]:bg-white/5 data-[selected]:bg-white/5"
        >
          {({ isSelected }) => (
            <>
              <span className="flex min-w-0 items-center gap-2.5">
                <ProviderIcon provider={m.provider} size={18} />
                <span className="truncate">{m.label}</span>
              </span>
              {isSelected && <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />}
            </>
          )}
        </ListBox.Item>,
      );
    }
  }

  return (
    <Select.Root
      selectedKey={selectedModel || null}
      onSelectionChange={(key) => {
        const id = key == null ? "" : String(key);
        if (id && !id.startsWith("__hdr_")) onModelChange(id);
      }}
      isDisabled={disabled || models.length === 0}
      aria-label="Select model"
    >
      <Select.Trigger className="flex h-auto min-h-0 w-auto items-center gap-1 rounded border-0 bg-transparent px-2 py-1 text-[11px] text-text-secondary shadow-none transition-colors hover:bg-surface-subtle">
        {current ? <ProviderIcon provider={current.provider} size={14} /> : <Zap className="h-3 w-3 shrink-0 text-accent-foreground" aria-hidden="true" />}
        {/* Render text only — the selected item's children carry their own icon,
            which would otherwise duplicate the explicit one above. */}
        <Select.Value className="truncate">{({ selectedText, isPlaceholder }) => (isPlaceholder ? "Model" : selectedText)}</Select.Value>
        <ChevronDown className="h-3 w-3 shrink-0 text-text-muted" aria-hidden="true" />
      </Select.Trigger>
      <Select.Popover
        placement="top start"
        className="min-w-52 overflow-hidden rounded-xl border p-1"
        style={{ backgroundColor: "#2d2d2d", borderColor: "#454545", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}
      >
        <ListBox disabledKeys={groups.map((g) => headerKey(g.provider))} className="max-h-72 overflow-auto outline-none">
          {rows}
        </ListBox>
      </Select.Popover>
    </Select.Root>
  );
}

type PromptInputToolbarProps = {
  children?: React.ReactNode;
};

function PromptInputToolbar({ children }: PromptInputToolbarProps) {
  return (
    <div data-prompt-toolbar className="flex items-center justify-between gap-2 px-2 pb-2">
      {children}
    </div>
  );
}

type PromptInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  status: ChatStatus;
  history?: string[];
  models: ModelOption[];
  selectedModel: string;
  onModelChange: (id: string) => void;
  /** Thread members for the @mention typeahead. Pass [] or omit to disable. */
  members?: ThreadMember[];
};

export function PromptInput({ value, onChange, onSubmit, status, history, models, selectedModel, onModelChange, members = [] }: PromptInputProps) {
  const isDisabled = status === "connecting" || status === "streaming";
  const [mentionState, setMentionState] = useState<{ query: string; atIndex: number } | null>(null);

  const handleCaretChange = useCallback(
    (pos: number) => {
      const detected = detectMention(value, pos);
      setMentionState(detected);
    },
    [value],
  );

  const handleValueChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      // Re-check after value change (caret is at end of inserted text on a normal keystroke)
      // We derive the caret position from the new value length for the "just typed" case.
      const detected = detectMention(newValue, newValue.length);
      setMentionState(detected);
    },
    [onChange],
  );

  const handleMentionSelect = useCallback(
    (member: ThreadMember) => {
      if (!mentionState) return;
      const newValue = insertMention(value, mentionState.atIndex, mentionState.query, member.handle);
      onChange(newValue);
      setMentionState(null);
    },
    [value, mentionState, onChange],
  );

  const handleMentionClose = useCallback(() => {
    setMentionState(null);
  }, []);

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isDisabled && value.trim()) {
      setMentionState(null);
      onSubmit();
    }
  }

  const mentionOpen = mentionState !== null && members.length > 0;

  return (
    <form data-prompt-input onSubmit={handleFormSubmit} className="shrink-0 bg-surface p-3">
      {mentionOpen && <MentionPicker query={mentionState.query} members={members} onSelect={handleMentionSelect} onClose={handleMentionClose} />}
      <div className="flex flex-col overflow-hidden rounded-md border border-primary bg-bg">
        <PromptInputTextarea
          value={value}
          onChange={handleValueChange}
          onSubmit={() => {
            setMentionState(null);
            onSubmit();
          }}
          disabled={isDisabled}
          history={history}
          onCaretChange={handleCaretChange}
        />
        <PromptInputToolbar>
          <ModelPicker models={models} selectedModel={selectedModel} onModelChange={onModelChange} disabled={isDisabled} />
          <PromptInputSubmit disabled={isDisabled || !value.trim()} onClick={onSubmit} />
        </PromptInputToolbar>
      </div>
    </form>
  );
}
