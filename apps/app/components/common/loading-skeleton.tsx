"use client";

import React from "react";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function LoadingSkeleton({
  className = "",
  count = 1,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex gap-4 pb-2 border-b border-border">
        <LoadingSkeleton className="h-4 w-[100px]" />
        <LoadingSkeleton className="h-4 w-[200px]" />
        <LoadingSkeleton className="h-4 w-[150px]" />
        <LoadingSkeleton className="h-4 w-[100px]" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2 border-b border-border/50">
          <LoadingSkeleton className="h-10 w-[100px]" />
          <LoadingSkeleton className="h-10 w-[200px]" />
          <LoadingSkeleton className="h-10 w-[150px]" />
          <LoadingSkeleton className="h-10 w-[100px]" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
      <LoadingSkeleton className="h-6 w-1/3" />
      <LoadingSkeleton className="h-20 w-full" />
      <div className="flex justify-between">
        <LoadingSkeleton className="h-8 w-24" />
        <LoadingSkeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
