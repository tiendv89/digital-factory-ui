"use client";

import { useEffect, useId } from "react";
import { Layers, X } from "lucide-react";
import type { ParsedFeature } from "@/services/yaml-parser";
import { formatTimestamp, getFeatureLastModifiedAt } from "@/lib/time";
import { getFeatureStatusColor, getFeatureStatusLabel } from "../../lib/status";

export type FeatureDetailSheetProps = {
  feature: ParsedFeature | null;
  onClose: () => void;
};

export function FeatureDetailSheet({
  feature,
  onClose,
}: FeatureDetailSheetProps) {
  const open = feature !== null;
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={
        "fixed inset-0 z-40 " +
        (open ? "pointer-events-auto" : "pointer-events-none")
      }
    >
      <button
        type="button"
        aria-label="Close feature detail"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={
          "absolute inset-0 cursor-default bg-black/80 transition-opacity duration-200 " +
          (open ? "opacity-100" : "opacity-0")
        }
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={
          "absolute right-0 top-0 flex h-full w-full flex-col bg-surface shadow-xl transition-transform duration-200 ease-out " +
          "sm:max-w-md md:max-w-lg lg:max-w-xl " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        {feature ? (
          <FeatureDetailContents
            feature={feature}
            onClose={onClose}
            titleId={titleId}
            descId={descId}
          />
        ) : null}
      </aside>
    </div>
  );
}

type ContentsProps = {
  feature: ParsedFeature;
  onClose: () => void;
  titleId: string;
  descId: string;
};

function FeatureDetailContents({
  feature,
  onClose,
  titleId,
  descId,
}: ContentsProps) {
  const statusLabel = getFeatureStatusLabel(feature.featureStatus);
  const statusColor = getFeatureStatusColor(feature.featureStatus);
  const lastModifiedAt = getFeatureLastModifiedAt(feature);

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-border bg-surface px-6 py-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-chip-bg px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {feature.id}
            </span>
            <span
              className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
              style={{ backgroundColor: statusColor + "22", color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
          <h2
            id={titleId}
            className="text-xl font-semibold leading-snug text-text-primary"
          >
            {feature.title || feature.id}
          </h2>
          <p id={descId} className="sr-only">
            Feature detail for {feature.id}: {feature.title}. Status:{" "}
            {statusLabel}.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 p-1 text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <section className="grid grid-cols-2 gap-x-6 gap-y-5">
          <MetaField
            icon={<Layers className="h-4 w-4" aria-hidden="true" />}
            label="Feature ID"
          >
            <span className="font-mono text-xs text-text-primary">
              {feature.id}
            </span>
          </MetaField>
          <MetaField label="Status">
            <span
              className="inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
              style={{ backgroundColor: statusColor + "22", color: statusColor }}
            >
              {statusLabel}
            </span>
          </MetaField>
          <MetaField label="Last Modified" fullWidth>
            {lastModifiedAt ? (
              <span className="text-text-primary">
                {formatTimestamp(lastModifiedAt)}
              </span>
            ) : (
              <NoneValue />
            )}
          </MetaField>
        </section>
      </div>
    </>
  );
}

function MetaField({
  icon,
  label,
  fullWidth,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={"flex flex-col gap-1.5 " + (fullWidth ? "col-span-2" : "")}>
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function NoneValue() {
  return <span className="italic text-text-muted">None</span>;
}
