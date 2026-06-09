"use client";

// jscpd:ignore-start
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { Inbox } from "lucide-react";
import { formatDate } from "@workspace/utils";
import type {
  AppComplianceSummary,
// jscpd:ignore-end
  AppDataSubjectRequest,
  DataSubjectRequestStatus,
} from "@workspace/types";
import { toDisplayText, isOpenRequest } from "./compliance-settings-constants";

export function PatientRightsCard({
  compliance,
  dataSubjectRequests,
  updateRequestMutation,
  onLogRequest,
  onUpdateStatus,
  clinicId,
}: {
  compliance: AppComplianceSummary | undefined;
  dataSubjectRequests: AppDataSubjectRequest[];
  updateRequestMutation: { isPending: boolean };
  onLogRequest: () => void;
  onUpdateStatus: (id: string, status: DataSubjectRequestStatus) => void;
  clinicId: string;
}) {
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
        {dataSubjectRequests.length > 0 ? (
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
                  {isOpenRequest(request.status) ? (
                    <>
                      {request.status === "OPEN" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onUpdateStatus(request.id, "IN_REVIEW")
                          }
                          disabled={updateRequestMutation.isPending}
                        >
                          Review
                        </Button>
                      ) : null}
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
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
