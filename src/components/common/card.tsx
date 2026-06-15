"use client";

import React from "react";

import { cn } from "./cn";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[13px] border border-border bg-surface", className)} {...props}>
      {children}
    </div>
  );
}
