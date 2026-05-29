"use client";

import { useEffect, useState } from "react";

/**
 * Returns a monotonically increasing tick counter that increments every
 * `intervalMs`. Components can use this as a dependency to recompute
 * relative-time labels without refetching server data.
 */
export function useLastUpdatedTimer(intervalMs = 10_000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return tick;
}
