"use client";

export function Loader() {
  return (
    <div
      data-agent-loader
      className="flex items-center gap-1 px-1 py-0.5"
      aria-label="Agent is responding"
    >
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
    </div>
  );
}
