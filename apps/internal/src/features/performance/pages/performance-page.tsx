import {
  internalOperationalMetricsSchema,
  type InternalOperationalMetrics,
} from "@workspace/types";
import {
  AppPageScaffold,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataState,
  PageHeader,
  Button,
} from "@workspace/ui/components";
import { RefreshCw } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api-query";

export function PerformancePage() {
  const { data, isLoading, isError, refetch } =
    useApiQuery<InternalOperationalMetrics>(
      "/api/internal/operational-metrics",
      {
        select: (response) => internalOperationalMetricsSchema.parse(response),
      },
    );
  const measured = (value: number | null | undefined, unit: string) =>
    value == null ? "Unavailable" : `${Number(value.toFixed(2))} ${unit}`;
  const observedCount = (value: number | undefined) =>
    value == null ? "Unavailable" : String(value);
  const customerScope =
    data?.definitionVersion === 2 && data.telemetry.requestScope === "CUSTOMER";
  const latencyDetail = customerScope
    ? "PostgreSQL interpolated percentile of valid customer-request durations."
    : "Legacy retained durations; scope and latency-validity rules are unconfirmed.";
  const metrics = data
    ? [
        {
          name: "Clinics with appointments",
          value: String(data.activity.clinicsWithAppointments),
          detail:
            "Distinct clinic records with appointments scheduled in this window; includes any demo or test records.",
        },
        {
          name: "Appointments scheduled",
          value: String(data.activity.appointments),
          detail:
            "Appointment start time falls in the window, including cancelled appointments.",
        },
        {
          name: "Completed appointments",
          value: String(data.activity.completedAppointments),
          detail:
            "Appointments scheduled in the window whose current status is completed.",
        },
        {
          name: "Clinic-patients seen",
          value: observedCount(data.activity.clinicPatientsSeen),
          detail:
            "Distinct clinic/patient pairs on completed appointments scheduled in the window; repeat visits count once per clinic.",
        },
        {
          name: "Prescriptions created",
          value: observedCount(data.activity.prescriptionsCreated),
          detail:
            "Prescription records created in the window, independent of approval or PDF generation.",
        },
        {
          name: "Invoices created",
          value: String(data.activity.invoices),
          detail:
            "Invoice records created in the window; this is not cash collected.",
        },
        {
          name: "Retained jobs",
          value: String(data.activity.jobs),
          detail:
            "Retained job records created in the window; cleanup can reduce this count.",
        },
        {
          name: "Jobs currently failed",
          value: String(data.activity.failedJobs),
          detail:
            "Retained jobs created in the window whose current status is failed; excludes recovered failures.",
        },
        {
          name: customerScope
            ? "Customer request samples"
            : "Request samples (legacy scope)",
          value: String(data.telemetry.samples),
          detail: customerScope
            ? "Retained customer API observations by completion time; missing capture is not successful traffic."
            : "Unversioned retained API observations; customer-only scope is unconfirmed.",
        },
        {
          name: "Valid latency samples",
          value: observedCount(data.telemetry.validLatencySamples),
          detail: "Customer observations eligible for latency percentiles.",
        },
        {
          name: "Invalid latency samples",
          value: observedCount(data.telemetry.invalidLatencySamples),
          detail:
            "Customer observations excluded from latency percentiles, but retained in request and error counts.",
        },
        {
          name: "Median response time",
          value: measured(data.telemetry.p50Ms, "ms"),
          detail: latencyDetail,
        },
        {
          name: "p95 response time",
          value: measured(data.telemetry.p95Ms, "ms"),
          detail: latencyDetail,
        },
        {
          name: "p99 response time",
          value: measured(data.telemetry.p99Ms, "ms"),
          detail: latencyDetail,
        },
        {
          name: "Server error rate",
          value:
            data.telemetry.errorRatePercent == null
              ? "Unavailable"
              : `${data.telemetry.errorRatePercent.toFixed(2)} %`,
          detail:
            "HTTP 5xx responses divided by retained request samples; not service availability.",
        },
      ]
    : [];
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Operational metrics"
          description="Actual records and measured telemetry · rolling 30 days"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetch();
              }}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          }
        />
      }
    >
      <DataState
        status={isError ? "error" : isLoading ? "loading" : "success"}
        loadingMessage="Loading performance metrics…"
        errorMessage="We could not load performance metrics. Please try again."
        onRetry={() => {
          void refetch();
        }}
      >
        {data && (
          <div className="mb-4 space-y-2 text-sm text-muted-foreground">
            <p>
              UTC window: {data.window.startInclusive} inclusive to{" "}
              {data.window.endExclusive} exclusive.
            </p>
            <p>
              {customerScope
                ? "Customer requests by observed completion time; health checks and internal routes are excluded."
                : "Legacy telemetry: request scope and latency-validity rules are unconfirmed."}
            </p>
            <p>
              {data.telemetry.samples === 0
                ? "No retained request samples. Latency and error rate are unavailable."
                : `Retained observation bounds: ${data.telemetry.firstSampleAt} to ${data.telemetry.lastSampleAt}. Gaps and retention may limit coverage.`}
            </p>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.name}>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {metric.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {metric.value}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {metric.detail}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </DataState>
    </AppPageScaffold>
  );
}
