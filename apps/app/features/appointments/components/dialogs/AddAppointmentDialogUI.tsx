import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";
import {
  createAppointmentSchema,
  Doctor,
  Patient,
  type AvailableSlot,
} from "@workspace/types";

type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
import type { SelectOption } from "@/lib/contexts/app-config-context";

import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Form, FormLabel } from "@workspace/ui/components/form";
import { FormDialog } from "@workspace/ui/components/form-dialog";
import {
  IsoDatePickerField,
  parseIsoDateToLocalDate,
} from "@workspace/ui/components/iso-date-picker-field";
import {
  clinicWallDatetimeLocalToUtcIso,
  formatClinicPickerDayIsoFromSelection,
} from "@workspace/utils";
import { AppointmentFormFields } from "@/features/appointments/components/sections/add-dialog/AppointmentFormFields";
import { PatientSelector } from "@/features/appointments/components/sections/add-dialog/PatientSelector";
import { DoctorSelector } from "@/features/appointments/components/sections/add-dialog/DoctorSelector";
import { TimeSlotPicker } from "@/features/appointments/components/sections/add-dialog/TimeSlotPicker";
import type { SlotBlockingAppointment } from "@/features/appointments/lib/calendar-slot-local-iso";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { formatClockTime, formatLocaleDateShortMonth } from "@/lib/formatters";

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

interface SectionHeaderProps {
  title: string;
  description?: string;
}

function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
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
      title={mode === "walk-in" ? "Add walk-in" : "Schedule Appointment"}
      description={
        mode === "walk-in"
          ? "Pick patient + doctor. We’ll use the next available slot."
          : "Pick the patient, doctor, date, time slot, and visit type."
      }
      contentClassName="sm:max-w-[840px]"
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <section className="space-y-4">
            <SectionHeader
              title="Patient & doctor"
              description="Who the appointment is for and who will see them."
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <PatientSelector
                form={form}
                patients={patients}
                patientsLoading={patientsLoading}
                patientSearch={patientSearch}
                setPatientSearch={setPatientSearch}
                patientComboboxOpen={patientComboboxOpen}
                setPatientComboboxOpen={setPatientComboboxOpen}
              />
              <DoctorSelector
                form={form}
                doctors={doctors}
                doctorsLoading={doctorsLoading}
              />
            </div>
          </section>

          <div className="border-t border-border/60" />

          {mode === "walk-in" ? (
            <section className="space-y-4">
              <SectionHeader
                title="Next available slot"
                description="Auto-selected from the doctor’s availability."
              />
              <div className="ui-card-surface flex flex-col gap-2 rounded-[var(--radius-lg)] border border-border/60 bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Slot
                  </span>
                  <Badge variant="secondary">
                    {slotReady ? "Ready" : "Finding…"}
                  </Badge>
                </div>
                <p className="text-sm text-foreground">
                  {slotReady
                    ? slotLabel
                    : doctorId
                      ? "Looking up availability for this doctor."
                      : "Select a doctor to find the next slot."}
                </p>
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <SectionHeader
                title="Schedule & type"
                description="Choose the appointment date, then a start time slot (defaults to the next opening)."
              />
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="space-y-4">
                  {selectedDate != null && onAdjustSchedulingDate ? (
                    <div className="flex flex-col gap-2">
                      <FormLabel htmlFor="add-appointment-schedule-date">
                        Date
                      </FormLabel>
                      <IsoDatePickerField
                        id="add-appointment-schedule-date"
                        label=""
                        showLabel={false}
                        value={formatClinicPickerDayIsoFromSelection(
                          selectedDate,
                          clinicTimezone,
                        )}
                        onChange={(iso) => {
                          const next = parseIsoDateToLocalDate(iso);
                          if (next) onAdjustSchedulingDate(next);
                        }}
                        placeholder="Select appointment date"
                        triggerClassName="w-full max-w-none sm:w-full"
                        disablePastDates
                      />
                    </div>
                  ) : null}
                  <TimeSlotPicker
                    form={form}
                    startHour={startHour}
                    endHour={endHour}
                    isResolvingDefaultSlot={isResolvingDefaultSlot}
                    selectedDate={selectedDate}
                    doctorId={doctorId}
                    availabilitySlotsReady={availabilitySlotsReady}
                    availabilitySlots={availabilitySlots}
                    clinicTimezone={clinicTimezone}
                    blockingAppointments={blockingAppointmentsForSlots}
                  />
                </div>
                <AppointmentFormFields
                  form={form}
                  appointmentTypeOptions={appointmentTypeOptions}
                />
              </div>
            </section>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                isResolvingDefaultSlot ||
                (mode === "walk-in" && !slotReady)
              }
            >
              {loading && <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />}
              {mode === "walk-in" ? "Add walk-in" : "Schedule"}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
