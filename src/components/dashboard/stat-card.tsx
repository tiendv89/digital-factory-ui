type CountVariant = "default" | "warning" | "danger";
type SubtitleVariant = "positive" | "negative" | "muted";

const countColors: Record<CountVariant, string> = {
  default: "text-text-primary",
  warning: "text-[#ffb547]",
  danger: "text-[#ff5e7d]",
};

const subtitleColors: Record<SubtitleVariant, string> = {
  positive: "text-success",
  negative: "text-danger",
  muted: "text-text-muted",
};

interface StatCardProps {
  label: string;
  count: number;
  subtitle?: string;
  subtitleVariant?: SubtitleVariant;
  countVariant?: CountVariant;
}

export function StatCard({
  label,
  count,
  subtitle,
  subtitleVariant = "muted",
  countVariant = "default",
}: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-surface p-5 shadow-[0px_1px_1px_rgba(16,24,40,0.04)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-text-muted">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <p className={`text-[32px] font-bold leading-8 tabular-nums ${countColors[countVariant]}`}>
          {count}
        </p>
        {subtitle && (
          <p className={`text-[12px] leading-4.5 ${subtitleColors[subtitleVariant]}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
