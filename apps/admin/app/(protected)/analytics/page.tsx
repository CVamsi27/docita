"use client";

import dynamic from "next/dynamic";

const AnalyticsDashboardLazy = dynamic(
  () =>
    import("@/components/analytics/analytics-dashboard").then(
      (module) => module.AnalyticsDashboard,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Loading analytics dashboard...
      </div>
    ),
  },
);

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Overview of clinic performance, revenue, appointments, and patient
          demographics.
        </p>
      </div>

      <AnalyticsDashboardLazy />
    </div>
  );
}
