"use client";

import dynamic from "next/dynamic";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Section } from "@workspace/ui/components/section";

const AnalyticsDashboardLazy = dynamic(
  () =>
    import("@/components/analytics/analytics-dashboard").then(
      (module) => module.AnalyticsDashboard,
    ),
  {
    ssr: false,
    loading: () => (
      <Section contentClassName="ui-section-stack">
        Loading analytics dashboard...
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
