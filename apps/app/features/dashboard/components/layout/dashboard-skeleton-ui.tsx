import { Skeleton } from "@workspace/ui/components/skeleton";

export type DashboardSkeletonVariant = "full" | "today";

interface DashboardSkeletonUIProps {
  variant?: DashboardSkeletonVariant;
}

export function DashboardSkeletonUI({
  variant = "full",
}: DashboardSkeletonUIProps) {
  const shortcutsRow = (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-20 w-24 shrink-0 rounded-[var(--radius-lg)]"
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <Skeleton
        className="h-24 rounded-[var(--radius-lg)]"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton
          className="h-48 rounded-[var(--radius-lg)] md:col-span-2 lg:col-span-2"
        />
        <Skeleton
          className="h-48 rounded-[var(--radius-lg)]"
        />
      </div>

      {variant === "full" ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-28 rounded-[var(--radius-lg)]"
              />
            ))}
          </div>
          {shortcutsRow}
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton
              className="h-[min(28rem,55vh)] rounded-[var(--radius-lg)] lg:col-span-2"
            />
            <div className="space-y-4">
              <Skeleton
                className="h-56 rounded-[var(--radius-lg)]"
              />
              <Skeleton
                className="h-40 rounded-[var(--radius-lg)]"
              />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton
              className="h-64 rounded-[var(--radius-lg)]"
            />
            <Skeleton
              className="h-64 rounded-[var(--radius-lg)]"
            />
          </div>
        </>
      ) : (
        <>
          {shortcutsRow}
          <Skeleton
            className="h-48 rounded-[var(--radius-lg)]"
          />
          <Skeleton
            className="h-[min(28rem,55vh)] rounded-[var(--radius-lg)]"
          />
        </>
      )}
    </div>
  );
}
