"use client";

import React from "react";

import { cn } from "./cn";

// Figma input: #2d2d2d bg, #454545 border, 8px radius, 13px text, #007acc focus.
const FIELD_BASE =
  "w-full rounded-[8px] border border-border-control bg-surface-secondary px-3 text-sm text-text-primary " +
  "placeholder:text-text-muted transition-colors " +
  "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(FIELD_BASE, "h-9", className)} {...props} />;
});

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Label + control + hint wrapper. Label uses Figma's 11px uppercase style. */
export function Field({ label, hint, required, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="text-[11px] text-text-muted">{hint}</p>}
    </div>
  );
}
