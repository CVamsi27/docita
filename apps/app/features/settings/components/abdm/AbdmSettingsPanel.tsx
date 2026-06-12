"use client";

import {
  Activity,
  BadgeIndianRupee,
  CheckCircle2,
  FileCheck2,
  Inbox,
  ShieldAlert,
} from "lucide-react";
import {
  useAbdmOpsInbox,
  useClinicAbdmDashboard,
  useUpdateClinicSettings,
} from "@workspace/data-access";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import {
  Alert,
  AlertDescription,
} from "@workspace/ui/components/feedback/alert";
import { Switch } from "@workspace/ui/components/form/switch";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  DashboardSkeleton,
  MetricTile,
  StatusBadge,
  formatInrFromPaise,
} from "./AbdmSettingsPanelParts";

export function AbdmSettingsPanel() {
  const { data: dashboard, isLoading, error } = useClinicAbdmDashboard();
  const { mutate: updateClinicSettings, isPending: isTogglePending } =
    useUpdateClinicSettings();
  const {
    data: opsInbox,
    isLoading: opsInboxLoading,
    error: opsInboxError,
  } = useAbdmOpsInbox({
    enabled: Boolean(dashboard?.abdmEnabled),
  });

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          We could not load ABDM readiness right now. Check your plan access and
          try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!dashboard) return null;

  const handleAbdmEnabledChange = (enabled: boolean) => {
    updateClinicSettings(
      { abdmEnabled: enabled },
      {
        onSuccess: () => {
          toast.success(enabled ? "ABDM enabled" : "ABDM turned off");
        },
        onError: (error) => {
          showUserFacingErrorToast(
            error,
            "We could not update ABDM status. Please try again.",
            "save",
          );
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                ABDM facility switch
              </CardTitle>
              <CardDescription>
                Keep ABDM off until ABDM credentials and certification callback
                details are available for this facility.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {dashboard.abdmEnabled ? "Enabled" : "Off"}
              </span>
              <Switch
                checked={dashboard.abdmEnabled}
                disabled={isTogglePending}
                aria-label="Enable ABDM for this facility"
                onCheckedChange={handleAbdmEnabledChange}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <Alert variant={dashboard.abdmEnabled ? "default" : "destructive"}>
            {dashboard.abdmEnabled ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            <AlertDescription>
              {dashboard.abdmEnabled
                ? "ABDM actions are enabled for this facility. They still require valid gateway credentials before verification or exchange can run."
                : "ABDM is off for this facility. ABHA verification, M2 linking, M3 consent, and callbacks will stay disabled until you turn this on."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Alert
        variant={
          dashboard.abdmEnabled && dashboard.environmentConfigured
            ? "default"
            : "destructive"
        }
      >
        {dashboard.abdmEnabled && dashboard.environmentConfigured ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <ShieldAlert className="h-4 w-4" />
        )}
        <AlertDescription>
          {dashboard.environmentConfigured
            ? "ABDM gateway credentials are configured. Sandbox and certification callbacks can be tested from this tenant."
            : "ABDM gateway credentials are not configured. Verification, M2 linking, and M3 consent dispatch will stay pending until ABDM envs are added."}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                ABDM readiness
              </CardTitle>
              <CardDescription>
                Track M1 configuration today and M2/M3 production blockers
                without claiming certification early.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={dashboard.m1Status} />
              <StatusBadge status={dashboard.m2Status} />
              <StatusBadge status={dashboard.m3Status} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-3">
          <MetricTile
            label="ABHA verified patients"
            value={`${dashboard.abhaVerifiedPatients}/${dashboard.totalPatients}`}
          />
          <MetricTile
            label="HFR Facility ID"
            value={dashboard.hfrConfigured ? "Saved" : "Missing"}
          />
          <MetricTile
            label="Doctor HPR IDs"
            value={`${dashboard.hprDoctorsConfigured} ready`}
            detail={
              dashboard.doctorsRequiringHpr > 0
                ? `${dashboard.doctorsRequiringHpr} pending`
                : "All doctor profiles ready"
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            ABDM ops inbox
          </CardTitle>
          <CardDescription>
            Track retryable gateway work, failed callbacks, pending M3 consent,
            and received external records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {!dashboard.abdmEnabled ? (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                ABDM ops inbox is paused while ABDM is off for this facility.
              </AlertDescription>
            </Alert>
          ) : opsInboxLoading ? (
            <Skeleton className="h-28 w-full rounded-lg" />
          ) : opsInboxError ? (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                ABDM operations could not be loaded right now.
              </AlertDescription>
            </Alert>
          ) : opsInbox ? (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <MetricTile
                  label="Retryable"
                  value={opsInbox.retryableTransactions.length.toString()}
                  detail="Usually missing gateway config or temporary gateway failures"
                />
                <MetricTile
                  label="Failed"
                  value={opsInbox.failedTransactions.length.toString()}
                />
                <MetricTile
                  label="Pending consents"
                  value={opsInbox.pendingConsents.length.toString()}
                />
                <MetricTile
                  label="External records"
                  value={opsInbox.recentExternalRecords.length.toString()}
                />
              </div>

              <div className="overflow-hidden rounded-[calc(var(--radius)-4px)] border border-border/60">
                {opsInbox.retryableTransactions
                  .slice(0, 5)
                  .map((transaction) => (
                    <div
                      key={transaction.id}
                      className="grid gap-1 border-b border-border/60 px-4 py-3 last:border-b-0"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-foreground">
                          {transaction.type.replaceAll("_", " ")}
                        </p>
                        <Badge variant="outline" className="w-fit">
                          {transaction.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {transaction.error ?? "Waiting for ABDM gateway retry"}
                      </p>
                    </div>
                  ))}
                {opsInbox.retryableTransactions.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No retryable ABDM work.
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5" />
            Readiness checklist
          </CardTitle>
          <CardDescription>
            M2/M3 items remain submitted or in progress until care contexts,
            FHIR validation, encrypted transfer, and ABDM callback evidence are
            approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60 p-0">
          {dashboard.readinessItems.map((item) => (
            <div
              key={item.key}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.detail}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="flex items-center gap-2">
            <BadgeIndianRupee className="h-5 w-5" />
            DHIS potential
          </CardTitle>
          <CardDescription>
            Estimate based on KYC-verified ABHA patients and current Docita
            records for {dashboard.dhisEstimate.month}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-3 md:grid-cols-4">
            <MetricTile
              label="Potential records"
              value={dashboard.dhisEstimate.totalPotentialRecords.toString()}
            />
            <MetricTile
              label="Above threshold"
              value={dashboard.dhisEstimate.recordsAboveThreshold.toString()}
              detail={`Threshold ${dashboard.dhisEstimate.threshold}/month`}
            />
            <MetricTile
              label="Facility estimate"
              value={formatInrFromPaise(
                dashboard.dhisEstimate.estimatedFacilityIncentivePaise,
              )}
            />
            <MetricTile
              label="Docita DSC estimate"
              value={formatInrFromPaise(
                dashboard.dhisEstimate.estimatedDscIncentivePaise,
              )}
            />
          </div>

          <div className="overflow-hidden rounded-[calc(var(--radius)-4px)] border border-border/60">
            {dashboard.dhisEstimate.breakdown.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {row.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.category === "CATEGORY_1"
                      ? "Category 1"
                      : "Category 2"}
                  </p>
                </div>
                <span className="ui-mono text-sm">{row.count}</span>
                <span className="text-xs text-muted-foreground">
                  {formatInrFromPaise(row.facilityRatePaise)}/HF
                </span>
              </div>
            ))}
          </div>

          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              {dashboard.dhisEstimate.sourceLabel} Rates shown from{" "}
              {dashboard.dhisEstimate.ratesEffectiveLabel}.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
