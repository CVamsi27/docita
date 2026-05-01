"use client";

import { Skeleton } from "./skeleton";

export function AppointmentCalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-7 gap-px border-b bg-muted p-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-muted p-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-24 rounded-sm bg-background p-2 space-y-1"
            >
              <Skeleton className="h-4 w-8" />
              {i % 3 === 0 && (
                <>
                  <Skeleton className="h-6 w-full" />
                  {i % 6 === 0 && <Skeleton className="h-6 w-full" />}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
