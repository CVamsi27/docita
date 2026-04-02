import { PortalMetricsUI } from "@/features/patient-portal/components/views/portal-metrics-ui";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";

export default function PortalMetricsPage() {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Metrics"
          description="Track trends and monitor your health metrics over time."
        />
      }
    >
      <PortalMetricsUI showHeader={false} />
    </AppPageScaffold>
  );
}
