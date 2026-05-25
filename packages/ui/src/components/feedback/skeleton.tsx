import { cn } from "@workspace/ui/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}

export function Skeleton({
  className,
  variant = "rectangular",
}: SkeletonProps) {
  const variantClasses = {
    text: "h-4 w-full rounded",
    circular: "rounded-full",
    rectangular: "rounded-md",
  };

  return (
    <div
      data-skeleton="true"
      className={cn("bg-muted", variantClasses[variant], className)}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <div className="flex items-baseline gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton variant="circular" className="h-12 w-12 ml-auto" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton variant="circular" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
