"use client";

import { Skeleton } from "./skeleton";

export function PatientListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton
            variant="circular"
            animation="wave"
            className="h-12 w-12"
          />

          <div className="flex-1 space-y-2">
            <Skeleton animation="wave" className="h-5 w-48" />
            <div className="flex gap-4">
              <Skeleton animation="wave" className="h-4 w-24" />
              <Skeleton animation="wave" className="h-4 w-32" />
              <Skeleton animation="wave" className="h-4 w-28" />
            </div>
          </div>

          <div className="flex gap-2">
            <Skeleton animation="wave" className="h-9 w-20" />
            <Skeleton animation="wave" className="h-9 w-9" />
          </div>
        </div>
      ))}
    </div>
  );
}
