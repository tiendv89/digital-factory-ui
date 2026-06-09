"use client";

import { NavRail } from "@/features/shell/components/NavRail";
import { Topbar } from "@/features/shell/components/Topbar";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-shell-layout
      className="flex h-full min-h-screen"
    >
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main
          data-shell-main
          className="flex-1 overflow-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
