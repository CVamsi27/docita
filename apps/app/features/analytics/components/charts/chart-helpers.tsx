import type { LucideIcon } from "lucide-react";
import {
  EmptyState as SharedEmptyState,
  LoadingState as SharedLoadingState,
} from "@workspace/ui/components/empty-state";
import { cn } from "@workspace/ui/lib/utils";

export const LoadingSpinner = ({ className }: { className?: string }) => (
  <SharedLoadingState
    message="Loading chart..."
    className={cn("h-full", className)}
  />
);

export const EmptyState = ({
  icon,
  label,
  sublabel,
}: {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
}) => (
  <SharedEmptyState
    icon={icon}
    title={label}
    description={sublabel}
    className="h-full"
  />
);

export const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
];
