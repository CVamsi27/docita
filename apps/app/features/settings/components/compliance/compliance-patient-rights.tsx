"use client";

import { FormEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Inbox } from "lucide-react";
import { formatDate } from "@workspace/utils";
import { IsoDatePickerField } from "@workspace/ui/components/form/iso-date-picker-field";
import type {
  AppComplianceSummary,
  AppDataSubjectRequest,
  CreateDataSubjectRequest,
  DataSubjectRequestStatus,
  DataSubjectRequestType,
} from "@workspace/types";
import {
  REQUEST_TYPE_OPTIONS,
  parseDataSubjectRequestType,
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
                    requestType: parseDataSubjectRequestType(value),
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
