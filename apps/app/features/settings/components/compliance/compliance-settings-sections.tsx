"use client";

import Link from "next/link";
import { FormEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
  Shield,
  Database,
  ClipboardList,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { formatDate } from "@workspace/utils";
import { IsoDatePickerField } from "@workspace/ui/components/iso-date-picker-field";
import type {
  AppAuditLogSummary,
  AppComplianceSummary,
  AppDataSubjectRequest,
  CreateDataSubjectRequest,
  DataSubjectRequestStatus,
  DataSubjectRequestType,
} from "@workspace/types";
import {
  DATA_RETENTION_POLICIES,
  REQUEST_TYPE_OPTIONS,
  toDisplayText,
  isOpenRequest,
} from "./compliance-settings-constants";

// ── Patient Rights Card ───────────────────────────────────────────────────────

interface PatientRightsCardProps {
  compliance: AppComplianceSummary | undefined;
  dataSubjectRequests: AppDataSubjectRequest[];
  updateRequestMutation: { isPending: boolean };
  onLogRequest: () => void;
  onUpdateStatus: (id: string, status: DataSubjectRequestStatus) => void;
  clinicId: string;
}

export function PatientRightsCard({
  compliance,
  dataSubjectRequests,
  updateRequestMutation,
  onLogRequest,
  onUpdateStatus,
  clinicId,
}: PatientRightsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Patient Rights Requests
            </CardTitle>
            <CardDescription>
              Track open access, export, withdrawal, and deletion requests that
              require facility follow-up.
            </CardDescription>
          </div>
          <Button size="sm" onClick={onLogRequest} disabled={!clinicId}>
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
                          onClick={() => onUpdateStatus(request.id, "IN_REVIEW")}
                          disabled={updateRequestMutation.isPending}
                        >
                          Review
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateStatus(request.id, "FULFILLED")}
                        disabled={updateRequestMutation.isPending}
                      >
                        Fulfill
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onUpdateStatus(request.id, "REJECTED")}
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
  );
}

// ── Log Request Dialog ────────────────────────────────────────────────────────

interface LogRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestForm: CreateDataSubjectRequest;
  onRequestFormChange: (form: CreateDataSubjectRequest) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}

export function LogRequestDialog({
  open,
  onOpenChange,
  requestForm,
  onRequestFormChange,
  onSubmit,
  isPending,
}: LogRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Log patient rights request</DialogTitle>
          <DialogDescription>
            Capture the operational request without attaching raw exports or
            unnecessary clinical details.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="request-type">
                Request type
              </label>
              <Select
                value={requestForm.requestType}
                onValueChange={(value) =>
                  onRequestFormChange({
                    ...requestForm,
                    requestType: value as DataSubjectRequestType,
                  })
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
                onRequestFormChange({ ...requestForm, dueAt: iso })
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
                  onRequestFormChange({
                    ...requestForm,
                    patientId: event.target.value,
                  })
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
                  onRequestFormChange({
                    ...requestForm,
                    requestChannel: event.target.value,
                  })
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
                  onRequestFormChange({
                    ...requestForm,
                    requestedByName: event.target.value,
                  })
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
                  onRequestFormChange({
                    ...requestForm,
                    requestedByRelation: event.target.value,
                  })
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
                onRequestFormChange({
                  ...requestForm,
                  requestDetails: event.target.value,
                })
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Save request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── DPDP Consent Status Card ──────────────────────────────────────────────────

interface DpdpConsentCardProps {
  compliance: AppComplianceSummary | undefined;
}

export function DpdpConsentCard({ compliance }: DpdpConsentCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          DPDP Consent Status
        </CardTitle>
        <CardDescription>
          Patient consent management under the Digital Personal Data Protection
          Act 2023.
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
  );
}

// ── Data Retention Policy Card ────────────────────────────────────────────────

export function DataRetentionCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Retention Policy
        </CardTitle>
        <CardDescription>
          How long different categories of data are retained in compliance with
          applicable regulations.
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
  );
}

// ── Audit Log Card ────────────────────────────────────────────────────────────

interface AuditLogCardProps {
  recentAuditLogs: AppAuditLogSummary[] | undefined;
}

export function AuditLogCard({ recentAuditLogs }: AuditLogCardProps) {
  return (
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
  );
}
