"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FeatureStatus } from "@/types/feature";

const STATUS_OPTIONS: Array<{ value: FeatureStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "in_design", label: "In Design" },
  { value: "in_tdd", label: "In TDD" },
  { value: "ready_for_implementation", label: "Ready" },
  { value: "in_implementation", label: "In Implementation" },
  { value: "in_handoff", label: "In Handoff" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
  { value: "cancelled", label: "Cancelled" },
];

interface FilterPillsProps {
  activeStatus?: string;
}

export function FilterPills({ activeStatus }: FilterPillsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const current = activeStatus ?? "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_OPTIONS.map(({ value, label }) => {
        const isActive = current === value;
        return (
          <button
            key={value}
            onClick={() => handleFilter(value)}
            className={[
              "inline-flex h-7 items-center rounded-full px-3 text-[11px] font-medium uppercase tracking-[0.5645px] transition-colors",
              isActive
                ? "border border-primary bg-primary text-white"
                : "border border-border bg-surface text-text-secondary hover:border-primary hover:text-primary",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
