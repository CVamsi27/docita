import { PageMeta } from "@/components/layout/page-meta";
import { AppPageScaffold, Button, PageHeader } from "@workspace/ui/components";
import { Download, FileText } from "lucide-react";
import { AnalyticsPageUI } from "@/features/analytics/components/AnalyticsPageUI";
import { useAnalyticsLogic } from "@/features/analytics/hooks/use-analytics-logic";

export function AnalyticsPage() {
  const { state, handlers } = useAnalyticsLogic();
  return (
    <>
      <PageMeta title="Analytics" description="Clinic performance metrics" />
      <AnalyticsPageUI
        overview={state.overview}
        diseaseTrends={state.diseaseTrends}
        revenueByCPT={state.revenueByCPT}
        complianceMetrics={state.complianceMetrics}
        isLoading={state.isLoading}
        isError={state.isError}
        onRetry={handlers.refetch}
        trendsLoading={state.trendsLoading}
        revenueLoading={state.revenueLoading}
        complianceLoading={state.complianceLoading}
        activeTab={state.activeTab}
        onTabChange={handlers.setActiveTab}
      />
    </>
  );
}

/* ── ReportsPage ──────────────────────────────────────── */

interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  lastGenerated?: string;
}

export function ReportsPage() {
  const reportList: ReportTemplate[] = [
    { id: "daily", name: "Daily Report", category: "Operations", description: "Today's activity summary" },
    { id: "monthly", name: "Monthly Summary", category: "Operations", description: "Monthly performance overview" },
    { id: "revenue", name: "Revenue Report", category: "Finance", description: "Revenue breakdown and trends" },
    { id: "patients", name: "Patient Stats", category: "Clinical", description: "Patient demographics and visits" },
    { id: "appointments", name: "Appointment Analysis", category: "Operations", description: "Appointment trends and no-shows" },
    { id: "prescriptions", name: "Prescription Report", category: "Clinical", description: "Prescription patterns and volumes" },
  ];

  return (
    <>
      <PageMeta title="Reports" description="Generate clinic reports" />
      <AppPageScaffold header={<PageHeader title="Reports" description="Generate and download clinic reports." />}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportList.map((r) => (
            <div key={r.id} className="rounded-lg border p-4 hover:bg-muted/30 cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">{r.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
              <Button variant="ghost" size="sm" className="mt-3 self-end">
                <Download className="mr-1.5 h-3 w-3" /> Generate
              </Button>
            </div>
          ))}
        </div>
      </AppPageScaffold>
    </>
  );
}
