"use client";

import { Modal as HeroModal } from "@heroui/react";
import { X } from "lucide-react";
import React from "react";

import { cn } from "./cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  hideHeader?: boolean;
}

const SIZE_MAP: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-3xl",
};

export function Modal({ open, onClose, title, icon, children, size = "md", className, hideHeader }: ModalProps) {
  return (
    <HeroModal.Root
      isOpen={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <HeroModal.Backdrop variant="opaque" isDismissable>
        <HeroModal.Container placement="center">
          <HeroModal.Dialog
            className={cn("p-0 rounded-[13px] border border-border bg-surface shadow-[0_8px_20px_rgba(0,0,0,0.5)] w-full max-h-[90vh] flex flex-col overflow-hidden", SIZE_MAP[size], className)}
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
          </HeroModal.Dialog>
        </HeroModal.Container>
      </HeroModal.Backdrop>
    </HeroModal.Root>
  );
}
