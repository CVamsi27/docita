import { Skeleton } from "@workspace/ui/components/skeleton";

export function DashboardSkeletonUI() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[400px] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    </div>
  );
}
