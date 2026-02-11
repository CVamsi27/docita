"use client";

import React from "react";

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
        <div
          key={i}
          className={`animate-pulse bg-muted rounded-md ${className}`}
        />
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-4">
      <div className="flex space-x-4 pb-2 border-b border-border">
        <LoadingSkeleton className="h-4 w-[100px]" />
        <LoadingSkeleton className="h-4 w-[200px]" />
        <LoadingSkeleton className="h-4 w-[150px]" />
        <LoadingSkeleton className="h-4 w-[100px]" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4 py-2 border-b border-border/50">
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
    <div className="p-6 bg-card rounded-xl border border-border shadow-sm space-y-4">
      <LoadingSkeleton className="h-6 w-1/3" />
      <LoadingSkeleton className="h-20 w-full" />
      <div className="flex justify-between">
        <LoadingSkeleton className="h-8 w-24" />
        <LoadingSkeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
