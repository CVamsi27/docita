import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";
import { createAppointmentSchema, Doctor, Patient, type AvailableSlot } from "@workspace/types";

type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
import type { SelectOption } from "@/lib/contexts/app-config-context";

import {
  Form,
} from "@workspace/ui/components/form/form";
import { FormDialog } from "@workspace/ui/components/form/form-dialog";
import {
  clinicWallDatetimeLocalToUtcIso,
} from "@workspace/utils";
import type { SlotBlockingAppointment } from "@/features/appointments/lib/calendar-slot-local-iso";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { formatClockTime, formatLocaleDateShortMonth } from "@/lib/formatters";
import { PatientDoctorSection, WalkInSlotSection, ScheduleSection, FormActionsSection } from "./AddAppointmentDialogUISections";

interface AddAppointmentDialogUIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "standard" | "walk-in";
  form: UseFormReturn<CreateAppointmentInput>;
  loading: boolean;
  patients: Patient[];
  patientsLoading: boolean;
  patientSearch: string;
  setPatientSearch: (search: string) => void;
  doctors: Doctor[];
  doctorsLoading: boolean;
  onSubmit: (
    data: CreateAppointmentInput,
    onSuccess?: () => void,
  ) => Promise<void>;
  appointmentTypeOptions: SelectOption[];
  patientComboboxOpen: boolean;
  setPatientComboboxOpen: (open: boolean) => void;
  startHour: number;
  endHour: number;
  isResolvingDefaultSlot: boolean;
  selectedDate?: Date;
  /** Updates the calendar day used for slot lookup (syncs with the appointments page date). */
  onAdjustSchedulingDate?: (next: Date) => void;
  availabilitySlotsReady: boolean;
  availabilitySlots: AvailableSlot[];
  clinicTimezone: string;
  blockingAppointmentsForSlots: SlotBlockingAppointment[];
}

export function AddAppointmentDialogUI({
  open,
  onOpenChange,
  mode = "standard",
  form,
  loading,
  patients,
  patientsLoading,
  patientSearch,
  setPatientSearch,
  doctors,
  doctorsLoading,
  onSubmit,
  appointmentTypeOptions,
  patientComboboxOpen,
  setPatientComboboxOpen,
  startHour,
  endHour,
  isResolvingDefaultSlot,
  selectedDate,
  onAdjustSchedulingDate,
  availabilitySlotsReady,
  availabilitySlots,
  clinicTimezone,
  blockingAppointmentsForSlots,
}: AddAppointmentDialogUIProps) {
  const doctorId = form.watch("doctorId");
  const startTime = form.watch("startTime");
  const endTime = form.watch("endTime");
  const slotReady = typeof startTime === "string" && startTime.length > 0;
  const slotLabel = (() => {
    if (!slotReady || typeof startTime !== "string") return "";
    const startUtc = clinicWallDatetimeLocalToUtcIso(
      startTime.trim(),
      clinicTimezone,
    );
    if (!startUtc) return "";
    const start = new Date(startUtc);
    if (Number.isNaN(start.getTime())) return "";
    const endUtc =
      typeof endTime === "string" && endTime.trim().length > 0
        ? clinicWallDatetimeLocalToUtcIso(endTime.trim(), clinicTimezone)
        : null;
    const end = endUtc ? new Date(endUtc) : null;
    return `${formatLocaleDateShortMonth(start)} • ${formatClockTime(start)}${
      end && !Number.isNaN(end.getTime()) ? ` – ${formatClockTime(end)}` : ""
    }`;
  })();
  const handleSubmit = form.handleSubmit(
    (data) => {
      onSubmit(data, () => onOpenChange(false));
    },
    () => {
      showUserFacingErrorToast(
        "Please check the highlighted fields and try again.",
        "Please check the highlighted fields and try again.",
        "form",
      );
    },
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "walk-in" ? "Add walk-in" : "Schedule appointment"}
      description={
        mode === "walk-in"
          ? "Pick patient + doctor. We’ll use the next available slot."
          : "Pick the patient, doctor, date, time slot, and visit type."
      }
      contentClassName="md:max-w-[840px]"
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} noValidate className="min-w-0 space-y-6">
          <PatientDoctorSection
            form={form}
            patients={patients}
            patientsLoading={patientsLoading}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            patientComboboxOpen={patientComboboxOpen}
            setPatientComboboxOpen={setPatientComboboxOpen}
            doctors={doctors}
            doctorsLoading={doctorsLoading}
          />

          <div className="border-t border-border/60" />

          {mode === "walk-in" ? (
            <WalkInSlotSection
              slotReady={slotReady}
              slotLabel={slotLabel}
              doctorId={doctorId}
            />
          ) : (
            <ScheduleSection
              form={form}
              selectedDate={selectedDate}
              onAdjustSchedulingDate={onAdjustSchedulingDate}
              startHour={startHour}
              endHour={endHour}
              isResolvingDefaultSlot={isResolvingDefaultSlot}
              doctorId={doctorId}
              availabilitySlotsReady={availabilitySlotsReady}
              availabilitySlots={availabilitySlots}
              clinicTimezone={clinicTimezone}
              blockingAppointments={blockingAppointmentsForSlots}
              appointmentTypeOptions={appointmentTypeOptions}
            />
          )}

          <FormActionsSection
            loading={loading}
            isResolvingDefaultSlot={isResolvingDefaultSlot}
            mode={mode}
            slotReady={slotReady}
            onOpenChange={onOpenChange}
          />
        </form>
      </Form>
    </FormDialog>
  );
}
