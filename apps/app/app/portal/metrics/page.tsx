export const dynamic = "force-dynamic";

import { PortalMetricsUI } from "@/features/patient-portal/components/views/portal-metrics-ui";
import {
  AppPageScaffold,
  PageHeader
} from "@workspace/ui/components";

export default function PortalMetricsPage() {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Metrics"
          description="Track trends and monitor your health metrics over time"
        />
      }
    >
      <PortalMetricsUI showHeader={false} />
    </AppPageScaffold>
  );
}
