"use client";

import { Loader2 } from "lucide-react";
import React from "react";

import { cn } from "./cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders a spinner and disables the button. */
  loading?: boolean;
  /** Icon rendered before the label. */
  leftIcon?: React.ReactNode;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white border border-transparent hover:bg-primary-hover",
  secondary: "bg-surface-secondary text-text-primary border border-border-control hover:bg-nav-item-hover",
  danger: "bg-danger-bg text-danger border border-danger/40 hover:bg-danger/15",
  ghost: "bg-transparent text-text-secondary border border-transparent hover:bg-surface-secondary hover:text-text-primary",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-8 px-3 text-sm gap-2",
  lg: "h-11 px-4 text-sm gap-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, leftIcon, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-[8px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : leftIcon}
      {children}
    </button>
  );
});
