import { Skeleton } from "@workspace/ui/components/skeleton";

export default function PatientsLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-28" />
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
