"use client";

import { Inbox } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, DataState } from "@workspace/ui/components";
import { AppointmentRequestRow } from "./requests/AppointmentRequestRow";
import { AppointmentRequestPastRow } from "./appointment-request-past-row";
import { useAppointmentRequestsPanel } from "./use-appointment-requests-panel";

export function AppointmentRequestsPanel() {
  const panel = useAppointmentRequestsPanel();

  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-[length:var(--fs-sm)] font-semibold">
            Appointment requests
          </CardTitle>
          {panel.pendingCount > 0 ? (
            <Badge
              variant="secondary"
              className="h-5 px-2 text-[length:var(--fs-2xs)]"
            >
              {panel.pendingCount} pending
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        <DataState
          status={panel.state}
          loadingMessage="Loading appointment requests…"
          errorMessage="We could not load appointment requests."
          onRetry={() => void panel.refetch()}
          emptyIcon={Inbox}
          emptyTitle="No pending requests"
          emptyDescription="Patient portal appointment requests will appear here"
        >
          <div className="space-y-2">
            {panel.sortedRequests.map((request) => (
              <AppointmentRequestRow
                key={request.id}
                request={request}
                doctorOptions={panel.doctorOptions}
                doctorByRequest={panel.doctorByRequest}
                setDoctorByRequest={panel.setDoctorByRequest}
                startByRequest={panel.startByRequest}
                setStartByRequest={panel.setStartByRequest}
                rejectReasonByRequest={panel.rejectReasonByRequest}
                setRejectReasonByRequest={panel.setRejectReasonByRequest}
                rejectCustomByRequest={panel.rejectCustomByRequest}
                setRejectCustomByRequest={panel.setRejectCustomByRequest}
                onApprove={panel.handleApprove}
                onReject={panel.handleReject}
                isMutating={panel.isMutating}
                approveFieldErrors={
                  panel.approveFieldErrorsByRequest[request.id]
                }
                onClearApproveFieldErrors={() =>
                  panel.setApproveFieldErrorsByRequest((prev) => {
                    if (!(request.id in prev)) return prev;
                    const next = { ...prev };
                    delete next[request.id];
                    return next;
                  })
                }
                clinicTimezone={panel.clinicTz}
                slotSuggestionGeneration={panel.slotSuggestionGeneration}
              />
            ))}
          </div>
        </DataState>
        <div className="mt-3 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => panel.setShowPastRequests((v) => !v)}
          >
            {panel.showPastRequests
              ? "Hide past requests"
              : "View past requests"}
          </Button>
          {panel.showPastRequests ? (
            <div className="mt-3">
              <DataState
                status={panel.pastState}
                loadingMessage="Loading past appointment requests…"
                errorMessage="We could not load past appointment requests."
                onRetry={() => {
                  void panel.refetchApprovedRequests();
                  void panel.refetchRejectedRequests();
                }}
                emptyIcon={Inbox}
                emptyTitle="No past requests"
                emptyDescription="Approved and rejected requests will appear here"
              >
                <div className="space-y-2">
                  {panel.pastRequests.map((request) => (
                    <AppointmentRequestPastRow
                      key={request.id}
                      request={request}
                    />
                  ))}
                </div>
              </DataState>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
