"use client";

import React from "react";

import { cn } from "./cn";

// Figma card/panel: #252526 surface, #3c3c3c border, 13px radius.
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[13px] border border-border bg-surface", className)} {...props}>
      {children}
    </div>
  );
}
