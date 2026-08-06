import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  label: string;
}

export const EmptyState = ({ icon: Icon, label }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12">
    <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
    <p className="text-muted-foreground text-center">{label}</p>
  </div>
);
