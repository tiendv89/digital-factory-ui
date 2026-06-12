"use client";

import { useCallback, useEffect, useState } from "react";

import { CommandPalette } from "@/components/shell/command-palette";
import { NavRail } from "@/components/shell/nav-rail";
import { Topbar } from "@/components/shell/topbar";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div data-shell-layout className="flex h-full min-h-screen">
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onCommandPalette={openPalette} />
        <main data-shell-main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}
