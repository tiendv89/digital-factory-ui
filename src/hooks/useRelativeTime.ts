"use client";

import { useEffect, useState } from "react";

/**
 * Returns a human-readable relative time string for a given ISO timestamp,
 * updating every 30 seconds and on window focus.
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
    const interval = setInterval(tick, 30_000);
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
  const seconds = Math.floor(diff / 1000);

  if (seconds < 0) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
