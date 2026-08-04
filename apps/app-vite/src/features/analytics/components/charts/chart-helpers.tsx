import type { LucideIcon } from "lucide-react";
import { EmptyState as SharedEmptyState, LoadingState as SharedLoadingState } from "@workspace/ui/components/feedback/empty-state";
import { cn } from "@workspace/ui/lib/utils";

export const LoadingSpinner = ({ className }: { className?: string }) => (
  <SharedLoadingState
    message="Loading chart…"
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
