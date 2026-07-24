"use client";

import dynamic from "next/dynamic";
import { AppPageScaffold, PageHeader, Section } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

const AnalyticsDashboardLazy = dynamic(
  () =>
    import("@/features/analytics/analytics-dashboard").then(
      (module) => module.AnalyticsDashboard,
    ),
  {
    ssr: false,
    loading: () => (
      <Section contentClassName="ui-section-stack">
        <div
          className="flex flex-col items-center gap-3 py-8 text-center"
          role="status"
          aria-live="polite"
          aria-label="Loading analytics dashboard"
        >
          <DocitaLoadingIndicator
            variant="section"
            withStatusRole={false}
            iconClassName="h-8 w-8 text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">
            Loading analytics dashboard…
          </p>
        </div>
      </Section>
    ),
  },
);

export default function AnalyticsPage() {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Analytics"
          description="Overview of clinic performance, revenue, appointments, and patient demographics."
        />
      }
    >
      <AnalyticsDashboardLazy />
    </AppPageScaffold>
  );
}
