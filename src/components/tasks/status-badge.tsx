import { clientStatusLabel } from "@/utils/board/status";
import { getStatusStyle } from "@/utils/tasks/status";

const ACTIVE_STATUSES = new Set(["in_progress", "reviewing"]);

function StatusSpinner({ className }: { className?: string }) {
  return (
    <svg className={["status-spinner", className].filter(Boolean).join(" ")} width="12" height="12" viewBox="0 0 14 14" aria-label="Processing" role="img">
      <title>Processing</title>
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20 10" strokeLinecap="round" />
    </svg>
  );
}

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusStyle = getStatusStyle(status);
  const isActive = ACTIVE_STATUSES.has(status);

  const baseClass = "inline-flex items-center gap-1.5 border border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide " + statusStyle.bg + " " + statusStyle.text;

  return (
    <span className={[baseClass, className].filter(Boolean).join(" ")}>
      {isActive && <StatusSpinner />}
      {clientStatusLabel(status)}
    </span>
  );
}
