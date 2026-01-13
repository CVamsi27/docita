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
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#FF6B9D",
  "#C084FC",
  "#34D399",
];
