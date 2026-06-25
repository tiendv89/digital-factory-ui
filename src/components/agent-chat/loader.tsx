"use client";

import { useEffect, useState } from "react";

export function Loader() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div data-agent-loader className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-text-muted" aria-label="Agent is responding" aria-live="polite">
      <span className="flex items-center gap-1">
        <span className="h-1 w-1 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
      </span>
      {seconds > 0 && (
        <span data-loader-timer className="tabular-nums text-text-muted/70">
          {seconds}s
        </span>
      )}
    </div>
  );
}
