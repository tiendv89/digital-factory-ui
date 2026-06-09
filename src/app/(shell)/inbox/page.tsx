"use client";

import { MessageSquare } from "lucide-react";

export default function InboxPage() {
  return (
    <div
      data-inbox-page
      className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <MessageSquare className="h-10 w-10 text-text-muted" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-text-primary">Inbox</p>
        <p className="mt-1 text-xs text-text-muted">Coming soon — notifications and gate items will appear here.</p>
      </div>
    </div>
  );
}
