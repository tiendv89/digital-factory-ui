"use client";

import { useEffect, useState } from "react";

import { formatLastUpdatedLabel } from "@/utils/time";

/**
 * Returns a human-readable relative time string for a given ISO timestamp,
 * updating every second and on window focus.
 *
 * Returns empty string when isoTimestamp is null or unparseable.
 */
export function useRelativeTime(isoTimestamp: string | null | undefined): string {
  const [display, setDisplay] = useState(() => compute(isoTimestamp));

  useEffect(() => {
    function tick() {
      setDisplay(compute(isoTimestamp));
    }

    tick();
    const interval = setInterval(tick, 1_000);
    window.addEventListener("focus", tick);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", tick);
    };
  }, [isoTimestamp]);

  return display;
}

function compute(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return "";
  const ms = new Date(isoTimestamp).getTime();
  if (Number.isNaN(ms)) return "";

  const diff = Date.now() - ms;

  if (diff < 0) return "just now";
  return formatLastUpdatedLabel(diff);
}
