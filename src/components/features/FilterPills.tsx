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
              "rounded-full px-3 py-1 text-[11px] font-medium leading-none transition-colors",
              isActive
                ? "bg-(--color-primary) text-white"
                : "border border-(--color-border) bg-(--color-surface) text-(--color-text-secondary) hover:border-(--color-primary) hover:text-(--color-primary)",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
