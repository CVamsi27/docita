"use client";

import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { StatGrid } from "@workspace/ui/components/stat-grid";

export function ConsultationDashboardSkeleton() {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Consultation"
          description="OPD queue and visits in progress for today — one board for the floor."
        />
      }
    >
      <StatGrid items={[]} columns={4} isLoading />
      <Card className="mt-6">
        <CardHeader>
          <Skeleton className="h-6 w-40 max-w-full" />
          <Skeleton className="mt-2 h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border/50 p-3 sm:p-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full max-w-md" />
                </div>
              </div>
              <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
            </div>
          ))}
        </CardContent>
      </Card>
    </AppPageScaffold>
  );
}
