import { cn } from "@workspace/ui/lib/utils";

export const LoadingSpinner = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center h-full", className)}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export const EmptyState = ({
  icon: Icon,
  label,
  sublabel,
}: {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
}) => (
  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
    <Icon className="h-12 w-12 mb-4 opacity-50" />
    <p>{label}</p>
    {sublabel && <p className="text-sm">{sublabel}</p>}
  </div>
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
