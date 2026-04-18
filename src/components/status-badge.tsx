import { Chip } from "@heroui/react";

type StatusValue = string;

type ChipColor = "default" | "accent" | "success" | "warning" | "danger";

const STATUS_COLOR_MAP: Record<string, ChipColor> = {
  // Task statuses
  blocked: "danger",
  in_progress: "accent",
  ready: "success",
  done: "default",
  in_review: "warning",
  todo: "default",

  // Feature stages
  in_design: "accent",
  in_tdd: "accent",
  in_implementation: "success",

  // Review statuses
  approved: "success",
  rejected: "danger",
  pending: "warning",
  not_required: "default",
};

function statusToColor(status: StatusValue): ChipColor {
  return STATUS_COLOR_MAP[status] ?? "default";
}

function statusLabel(status: StatusValue): string {
  return status.replace(/_/g, " ");
}

interface StatusBadgeProps {
  status: StatusValue;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  return (
    <Chip color={statusToColor(status)} size={size} variant="soft">
      {statusLabel(status)}
    </Chip>
  );
}
