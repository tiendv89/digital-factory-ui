"use client";

import { Send, Zap } from "lucide-react";
import { type ChangeEvent, type FormEvent, type KeyboardEvent, useRef } from "react";

import type { ChatStatus } from "./types";

type PromptInputTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
};

function PromptInputTextarea({ value, onChange, onSubmit, disabled, placeholder = "Message the agent…" }: PromptInputTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    // Auto-resize
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
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
};

export function PromptInput({ value, onChange, onSubmit, status }: PromptInputProps) {
  const isDisabled = status === "connecting" || status === "streaming";

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isDisabled && value.trim()) {
      onSubmit();
    }
  }

  return (
    <form data-prompt-input onSubmit={handleFormSubmit} className="shrink-0 bg-surface p-3">
      <div className="flex flex-col overflow-hidden rounded-md border border-primary bg-bg">
        <PromptInputTextarea value={value} onChange={onChange} onSubmit={onSubmit} disabled={isDisabled} />
        <PromptInputToolbar>
          <span className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-text-secondary">
            <Zap className="h-3 w-3 text-accent-foreground" aria-hidden="true" />
            Claude Sonnet 4.6
          </span>
          <PromptInputSubmit disabled={isDisabled || !value.trim()} onClick={onSubmit} />
        </PromptInputToolbar>
      </div>
    </form>
  );
}
