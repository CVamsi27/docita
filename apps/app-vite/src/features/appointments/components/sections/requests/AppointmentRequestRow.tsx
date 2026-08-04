import { Check } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import {patientName} from "./request-row-helpers";
import { RequestAdjustPopover } from "./RequestAdjustPopover";
import { RequestRejectPopover } from "./RequestRejectPopover";
import { AppointmentRequestRowInfo } from "./AppointmentRequestRowSections";
import {
  useAppointmentRequestRow,
  type UseAppointmentRequestRowInput,
} from "./use-appointment-request-row";


type AppointmentRequestRowProps = UseAppointmentRequestRowInput;

export function AppointmentRequestRow(props: AppointmentRequestRowProps) {
  const h = useAppointmentRequestRow(props);

  return (
    <div className="group/req rounded-md border border-border/60 bg-card transition-colors hover:bg-muted/20">
      <div className="flex items-center gap-3 px-3 py-2">
        <AppointmentRequestRowInfo
          patientNameText={patientName(h.request)}
          phone={h.phone}
          arrivalRelative={h.arrivalRelative}
          reason={h.request.reason}
          summaryPrimary={h.summary.primary}
          preferredDoctorLabel={h.preferredDoctorLabel}
          notes={h.request.notes}
          approveError={h.approveError}
        />

        <div className="flex shrink-0 items-center gap-1">
          <RequestAdjustPopover
            requestId={h.request.id}
            doctorOptions={h.doctorOptions}
            effectiveDoctorId={h.effectiveDoctorId}
            selectedDoctorName={h.selectedDoctorName}
            slotLabel={h.slotLabel}
            slotDayLabel={h.slotDayLabel}
            startDayIso={h.startDayIso}
            startTimeHHmm={h.startTimeHHmm}
            endHHmm={h.endHHmm}
            availableStartTimes={h.availableStartTimes}
            isStartAllowed={h.isStartAllowed}
            hasApproveFieldErrors={h.hasApproveFieldErrors}
            approveFieldErrors={h.approveFieldErrors}
            clinicTimezone={h.clinicTimezone}
            onClearApproveFieldErrors={h.onClearApproveFieldErrors}
            setDoctorByRequest={h.setDoctorByRequest}
            setStartByRequest={h.setStartByRequest}
          />

          <Button
            size="sm"
            className="h-8 gap-1 px-3 text-[length:var(--fs-xs)]"
            disabled={h.approveBlocked}
            onClick={() => void h.onApprove(h.request)}
            aria-label={`Approve at ${h.slotLabel}`}
          >
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Approve
          </Button>

          <RequestRejectPopover
            request={h.request}
            rejectReason={h.rejectReason}
            rejectCustom={h.rejectCustom}
            isMutating={h.isMutating}
            canSubmitReject={h.canSubmitReject}
            setRejectReasonByRequest={h.setRejectReasonByRequest}
            setRejectCustomByRequest={h.setRejectCustomByRequest}
            onReject={h.onReject}
          />
        </div>
      </div>
    </div>
  );
}
