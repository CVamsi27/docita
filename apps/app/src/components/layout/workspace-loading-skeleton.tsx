import { Skeleton } from "@workspace/ui/components/feedback/skeleton";

export function WorkspaceLoadingSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background" role="status" aria-live="polite" aria-label="Loading workspace">
      <div className="hidden md:flex w-[18%] min-w-[200px] flex-col border-r p-4 gap-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex flex-col gap-2 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full rounded-md" />))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b flex items-center px-6 gap-4 md:hidden">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex-1 p-4 md:p-6 flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-28 rounded-lg" />))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
