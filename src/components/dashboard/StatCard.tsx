import type { LucideIcon } from "lucide-react";

type ColorVariant = "primary" | "success" | "danger" | "warning" | "muted";

const variantStyles: Record<
  ColorVariant,
  { icon: string; iconBg: string; count: string }
> = {
  primary: {
    icon: "text-(--color-primary)",
    iconBg: "bg-(--color-primary-light)",
    count: "text-(--color-text-primary)",
  },
  success: {
    icon: "text-(--color-success)",
    iconBg: "bg-(--color-success-bg)",
    count: "text-(--color-text-primary)",
  },
  danger: {
    icon: "text-(--color-danger)",
    iconBg: "bg-(--color-danger-bg)",
    count: "text-(--color-text-primary)",
  },
  warning: {
    icon: "text-(--color-warning)",
    iconBg: "bg-(--color-warning-bg)",
    count: "text-(--color-text-primary)",
  },
  muted: {
    icon: "text-(--color-text-muted)",
    iconBg: "bg-(--color-border)",
    count: "text-(--color-text-primary)",
  },
};

interface StatCardProps {
  label: string;
  count: number;
  Icon: LucideIcon;
  variant: ColorVariant;
}

export function StatCard({ label, count, Icon, variant }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className="flex items-center gap-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}
        style={
          variant === "primary"
            ? { backgroundColor: "rgba(84,101,232,0.08)" }
            : undefined
        }
      >
        <Icon size={20} className={styles.icon} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wide">
          {label}
        </p>
        <p className={`mt-0.5 text-2xl font-bold tabular-nums ${styles.count}`}>
          {count}
        </p>
      </div>
    </div>
  );
}
