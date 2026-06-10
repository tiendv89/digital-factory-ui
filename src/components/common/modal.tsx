"use client";

import { X } from "lucide-react";
import React, { useEffect } from "react";

import { cn } from "./cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Optional icon shown left of the title. */
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Panel max width. Default "md". */
  size?: "sm" | "md" | "lg" | "xl";
  /** Extra classes for the panel. */
  className?: string;
  /** Hide the default header (title + close). */
  hideHeader?: boolean;
}

const SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-3xl",
};

/**
 * Centered modal matching Figma: rgba(0,0,0,0.6) backdrop, #252526 panel,
 * #3c3c3c border, 13px radius, 0 8px 20px rgba(0,0,0,0.5) shadow.
 */
export function Modal({ open, onClose, title, icon, children, size = "md", className, hideHeader }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn("flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[13px] border border-border bg-surface shadow-[0_8px_20px_rgba(0,0,0,0.5)]", SIZE[size], className)}
      >
        {!hideHeader && (
          <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              {icon}
              <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary">
              <X className="h-4 w-4" />
            </button>
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
