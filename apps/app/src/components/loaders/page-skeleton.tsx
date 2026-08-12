import { Skeleton } from "@workspace/ui/components";

/* -------------------------------------------------------------------------- */
/*  Skeleton primitives                                                       */
/* -------------------------------------------------------------------------- */

function SkeletonBar({ className = "" }: { className?: string }) {
  return <Skeleton className={className} />;
}

/* -------------------------------------------------------------------------- */
/*  Dashboard skeleton (stats cards + table)                                  */
/* -------------------------------------------------------------------------- */

export function DashboardSkeleton({ actionCount = 4 }: { actionCount?: number }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBar className="h-6 w-48" />
          <SkeletonBar className="h-4 w-72" />
        </div>
        <SkeletonBar className="h-9 w-32" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: actionCount }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <SkeletonBar className="h-4 w-24" />
            <SkeletonBar className="h-8 w-16" />
            <SkeletonBar className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Table rows */}
      <div className="rounded-lg border divide-y divide-border/60">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <SkeletonBar className="h-4 w-32" />
            <SkeletonBar className="h-4 w-24 ml-auto" />
            <SkeletonBar className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  List page skeleton (search + rows)                                        */
/* -------------------------------------------------------------------------- */

export function ListPageSkeleton({ rowCount = 6 }: { rowCount?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBar className="h-6 w-40" />
          <SkeletonBar className="h-4 w-56" />
        </div>
        <SkeletonBar className="h-9 w-28" />
      </div>
      <SkeletonBar className="h-10 w-full max-w-sm" />
      <div className="rounded-lg border divide-y divide-border/60">
        {Array.from({ length: rowCount }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <SkeletonBar className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <SkeletonBar className="h-4 w-36" />
              <SkeletonBar className="h-3 w-24" />
            </div>
            <SkeletonBar className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Detail page skeleton (back button + cards)                                */
/* -------------------------------------------------------------------------- */

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SkeletonBar className="h-8 w-8 rounded-md" />
        <div className="space-y-1.5">
          <SkeletonBar className="h-5 w-48" />
          <SkeletonBar className="h-3 w-32" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-5 space-y-4">
          <SkeletonBar className="h-5 w-32" />
          <SkeletonBar className="h-4 w-full" />
          <SkeletonBar className="h-4 w-3/4" />
          <SkeletonBar className="h-4 w-1/2" />
        </div>
        <div className="rounded-lg border p-5 space-y-4">
          <SkeletonBar className="h-5 w-32" />
          <SkeletonBar className="h-4 w-full" />
          <SkeletonBar className="h-4 w-3/4" />
          <SkeletonBar className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stats cards skeleton (for stat-grid-heavy pages like analytics, daybook)   */
/* -------------------------------------------------------------------------- */

export function StatCardsSkeleton({ cardCount = 4 }: { cardCount?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cardCount }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <SkeletonBar className="h-4 w-24" />
          <SkeletonBar className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card grid skeleton (for card-grid layouts like hospital beds, templates)   */
/* -------------------------------------------------------------------------- */

export function CardGridSkeleton({ cardCount = 6, columns = 3 }: { cardCount?: number; columns?: number }) {
  const gridCols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns] ?? "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {Array.from({ length: cardCount }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <SkeletonBar className="h-5 w-5 rounded-md" />
          <SkeletonBar className="h-5 w-32" />
          <SkeletonBar className="h-3 w-48" />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Table skeleton (for tab content inside detail pages)                       */
/* -------------------------------------------------------------------------- */

export function TableSkeleton({ rowCount = 4 }: { rowCount?: number }) {
  return (
    <div className="rounded-lg border divide-y divide-border/60">
      {Array.from({ length: rowCount }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="space-y-1.5 flex-1">
            <SkeletonBar className="h-4 w-36" />
            <SkeletonBar className="h-3 w-24" />
          </div>
          <SkeletonBar className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}


