"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  CheckCircle2,
  FileText,
  Shield,
  Database,
  ClipboardList,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { formatDate } from "@workspace/utils";
import { ClinicSlaSignatureQR } from "@/features/settings/components/clinic-sla-signature-qr";
import { IsoDatePickerField } from "@workspace/ui/components/iso-date-picker-field";
import { useAPIMutation, useAPIQuery } from "@/lib/api-core";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  createDataSubjectRequestSchema,
  type CreateDataSubjectRequest,
  type DataSubjectRequestStatus,
  type DataSubjectRequestType,
  type UpdateDataSubjectRequest,
} from "@workspace/types";
import type {
  AppAuditLogSummary,
  AppComplianceSummary,
  AppDataSubjectRequest,
} from "@workspace/types";

const DATA_RETENTION_POLICIES = [
  {
    category: "Patient Records",
    retention: "7 years",
    description: "Medical records retained per DPDP Act 2023 guidelines",
  },
  {
    category: "Appointment History",
    retention: "5 years",
    description: "Appointment logs retained for continuity of care",
  },
  {
    category: "Audit Logs",
    retention: "3 years",
    description: "System access and data change logs",
  },
  {
    category: "Prescription Data",
    retention: "7 years",
    description: "Prescription records per clinical documentation standards",
  },
];

const REQUEST_TYPE_OPTIONS: Array<{
  value: DataSubjectRequestType;
  label: string;
}> = [
  { value: "EXPORT", label: "Data export" },
  { value: "ACCESS", label: "Access request" },
  { value: "DELETION", label: "Deletion review" },
  { value: "CONSENT_WITHDRAWAL", label: "Consent withdrawal" },
  { value: "CORRECTION", label: "Correction request" },
];

const INITIAL_REQUEST_FORM: CreateDataSubjectRequest = {
  requestType: "EXPORT",
  patientId: "",
  requestedByName: "",
  requestedByRelation: "",
  requestChannel: "in_person",
  requestDetails: "",
  dueAt: "",
};

type UpdateRequestPayload = UpdateDataSubjectRequest & {
  requestId: string;
};

function toDisplayText(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function isOpenRequest(status: DataSubjectRequestStatus): boolean {
  return status === "OPEN" || status === "IN_REVIEW";
}

export function ComplianceSettingsPanel() {
  const { user } = useAuth();
  const clinicId = user?.clinicId ?? "";
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] =
    useState<CreateDataSubjectRequest>(INITIAL_REQUEST_FORM);

  const { data: compliance } = useAPIQuery<AppComplianceSummary>(
    ["clinic-compliance", clinicId],
    `/clinics/${clinicId}/compliance`,
    { enabled: !!clinicId },
  );

  const { data: recentAuditLogs } = useAPIQuery<AppAuditLogSummary[]>(
    ["audit-logs-recent", clinicId],
    `/audit/recent?limit=5`,
    { enabled: !!clinicId },
  );

  const { data: dataSubjectRequests = [] } = useAPIQuery<
    AppDataSubjectRequest[]
  >(
    ["data-subject-requests", clinicId],
    `/clinics/${clinicId}/data-subject-requests`,
    { enabled: !!clinicId },
  );

  const invalidateComplianceData = [
    ["clinic-compliance", clinicId],
    ["data-subject-requests", clinicId],
    ["audit-logs-recent", clinicId],
  ] as const;

  const createRequestMutation = useAPIMutation<
    AppDataSubjectRequest,
    CreateDataSubjectRequest
  >(`/clinics/${clinicId}/data-subject-requests`, "POST", {
    invalidateKeys: invalidateComplianceData,
    onSuccess: () => {
      toast.success("Patient rights request logged");
      setRequestDialogOpen(false);
      setRequestForm(INITIAL_REQUEST_FORM);
    },
    onError: (error) => {
      showUserFacingErrorToast(
        error,
        "We could not log this patient rights request. Please try again.",
        "form",
      );
    },
  });

  const updateRequestMutation = useAPIMutation<
    AppDataSubjectRequest,
    UpdateRequestPayload
  >(
    (variables) =>
      `/clinics/${clinicId}/data-subject-requests/${variables.requestId}`,
    "PATCH",
    {
      invalidateKeys: invalidateComplianceData,
      onSuccess: () => {
        toast.success("Patient rights request updated");
      },
      onError: (error) => {
        showUserFacingErrorToast(
          error,
          "We could not update this patient rights request. Please try again.",
          "form",
        );
      },
    },
  );

  const handleCreateRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = createDataSubjectRequestSchema.safeParse({
      ...requestForm,
      patientId: requestForm.patientId || undefined,
      requestedByName: requestForm.requestedByName || undefined,
      requestedByRelation: requestForm.requestedByRelation || undefined,
      requestChannel: requestForm.requestChannel || undefined,
      requestDetails: requestForm.requestDetails || undefined,
      dueAt: requestForm.dueAt || undefined,
    });

    if (!parsed.success) {
      showUserFacingErrorToast(
        null,
        "Please check the request details and try again",
        "form",
      );
      return;
    }

    createRequestMutation.mutate(parsed.data);
  };

  const updateRequestStatus = (
    requestId: string,
    status: DataSubjectRequestStatus,
  ) => {
    updateRequestMutation.mutate({ requestId, status });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {compliance?.slaSignatureUrl && compliance.slaSignatureAcceptedAt && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            SLA accepted and signed on
            <span className="ml-1">
              {formatDate(compliance.slaSignatureAcceptedAt, "dd MMMM yyyy")}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Service Level Agreement Signature
          </CardTitle>
          <CardDescription>
            Your SLA signature is a legally binding record of your acceptance of
            Docita&apos;s service terms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {compliance?.slaSignatureUrl && (
            <div className="mb-4 rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground mb-2">
                Current signature on file
              </p>
              <img
                src={compliance.slaSignatureUrl}
                alt="Current SLA signature"
                className="max-h-20 object-contain"
              />
            </div>
          )}
          <ClinicSlaSignatureQR clinicId={clinicId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                Patient Rights Requests
              </CardTitle>
              <CardDescription>
                Track open access, export, withdrawal, and deletion requests
                that require facility follow-up.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setRequestDialogOpen(true)}
              disabled={!clinicId}
            >
              Log request
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Exports open</p>
            <p className="text-2xl font-semibold">
              {compliance?.dataExportRequestsOpen ?? 0}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Withdrawals open</p>
            <p className="text-2xl font-semibold">
              {compliance?.withdrawalRequestsOpen ?? 0}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Deletion reviews</p>
            <p className="text-2xl font-semibold">
              {compliance?.dataDeletionRequestsOpen ?? 0}
            </p>
          </div>
          {dataSubjectRequests.length > 0 && (
            <div className="sm:col-span-3 space-y-2 pt-2">
              {dataSubjectRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {toDisplayText(request.requestType)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due
                      <span className="ml-1">
                        {request.dueAt
                          ? formatDate(request.dueAt, "dd MMMM yyyy")
                          : "not set"}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {toDisplayText(request.status)}
                    </Badge>
                    {isOpenRequest(request.status) && (
                      <>
                        {request.status === "OPEN" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateRequestStatus(request.id, "IN_REVIEW")
                            }
                            disabled={updateRequestMutation.isPending}
                          >
                            Review
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateRequestStatus(request.id, "FULFILLED")
                          }
                          disabled={updateRequestMutation.isPending}
                        >
                          Fulfill
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateRequestStatus(request.id, "REJECTED")
                          }
                          disabled={updateRequestMutation.isPending}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Log patient rights request</DialogTitle>
            <DialogDescription>
              Capture the operational request without attaching raw exports or
              unnecessary clinical details.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateRequest}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="request-type">
                  Request type
                </label>
                <Select
                  value={requestForm.requestType}
                  onValueChange={(value) =>
                    setRequestForm((current) => ({
                      ...current,
                      requestType: value as DataSubjectRequestType,
                    }))
                  }
                >
                  <SelectTrigger id="request-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <IsoDatePickerField
                id="request-due"
                label="Due date"
                value={String(requestForm.dueAt ?? "")}
                onChange={(iso) =>
                  setRequestForm((current) => ({
                    ...current,
                    dueAt: iso,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="patient-id">
                  Patient ID
                </label>
                <Input
                  id="patient-id"
                  value={requestForm.patientId ?? ""}
                  placeholder="Patient ID"
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      patientId: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="channel">
                  Request channel
                </label>
                <Input
                  id="channel"
                  value={requestForm.requestChannel ?? ""}
                  placeholder="Request channel"
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      requestChannel: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="requester">
                  Requested by
                </label>
                <Input
                  id="requester"
                  value={requestForm.requestedByName ?? ""}
                  placeholder="Name or initials"
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      requestedByName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="relation">
                  Relation
                </label>
                <Input
                  id="relation"
                  value={requestForm.requestedByRelation ?? ""}
                  placeholder="Relation"
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      requestedByRelation: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="details">
                Request details
              </label>
              <Textarea
                id="details"
                value={requestForm.requestDetails ?? ""}
                placeholder="Request details"
                onChange={(event) =>
                  setRequestForm((current) => ({
                    ...current,
                    requestDetails: event.target.value,
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRequestDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createRequestMutation.isPending}>
                Save request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            DPDP Consent Status
          </CardTitle>
          <CardDescription>
            Patient consent management under the Digital Personal Data
            Protection Act 2023.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Consent Collection</p>
              <p className="text-xs text-muted-foreground">
                Patients are asked for consent before data is collected.
              </p>
            </div>
            <Badge variant="outline" className="badge-success">
              Active
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Consent Template</p>
              <p className="text-xs text-muted-foreground">
                {compliance?.consentTemplateUpdatedAt
                  ? `Last updated ${formatDate(compliance.consentTemplateUpdatedAt, "dd MMMM yyyy")}`
                  : "Default template in use"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                compliance?.consentTemplateEnabled
                  ? "badge-success"
                  : "badge-warning"
              }
            >
              {compliance?.consentTemplateEnabled ? "Custom" : "Default"}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Data Subject Rights</p>
              <p className="text-xs text-muted-foreground">
                Patients can request access, correction, or deletion of their
                data.
              </p>
            </div>
            <Badge variant="outline" className="badge-success">
              Enabled
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Retention Policy
          </CardTitle>
          <CardDescription>
            How long different categories of data are retained in compliance
            with applicable regulations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {DATA_RETENTION_POLICIES.map((policy) => (
              <div
                key={policy.category}
                className="flex items-start justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium">{policy.category}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {policy.description}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-4 shrink-0">
                  {policy.retention}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Audit Log
            </CardTitle>
            <CardDescription>
              Recent system access and data change events for your facility.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings?tab=audit">
              View all
              <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentAuditLogs && recentAuditLogs.length > 0 ? (
            <div className="divide-y text-sm">
              {recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-muted-foreground font-mono text-xs">
                    {log.action}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(log.createdAt, "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent audit events.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
