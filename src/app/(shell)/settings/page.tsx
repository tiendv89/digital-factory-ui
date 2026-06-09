"use client";

import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div
      data-settings-page
      className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <Settings className="h-10 w-10 text-text-muted" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-text-primary">Settings</p>
        <p className="mt-1 text-xs text-text-muted">Account and workspace settings will appear here.</p>
      </div>
    </div>
  );
}
