import { Skeleton } from "@workspace/ui/components/skeleton";

export default function InvoicesLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
