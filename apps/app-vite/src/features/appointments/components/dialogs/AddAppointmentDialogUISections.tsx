import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";
import { createAppointmentSchema, Doctor, Patient, type AvailableSlot } from "@workspace/types";
import type { SelectOption } from "@/lib/contexts/app-config-context";
import { Badge, Button, FormField, FormItem, FormLabel, FormMessage, IsoDatePickerField, parseIsoDateToLocalDate } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { formatClinicPickerDayIsoFromSelection } from "@workspace/utils";
import { AppointmentFormFields } from "@/features/appointments/components/sections/add-dialog/AppointmentFormFields";
import { PatientSelector } from "@/features/appointments/components/sections/add-dialog/PatientSelector";
import { DoctorSelector } from "@/features/appointments/components/sections/add-dialog/DoctorSelector";
import { TimeSlotPicker } from "@/features/appointments/components/sections/add-dialog/TimeSlotPicker";
import type { SlotBlockingAppointment } from "@/features/appointments/lib/calendar-slot-local-iso";

type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

interface SectionHeaderProps {
  title: string;
  description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

interface PatientDoctorSectionProps {
  form: UseFormReturn<CreateAppointmentInput>;
  patients: Patient[];
  patientsLoading: boolean;
  patientSearch: string;
  setPatientSearch: (search: string) => void;
  patientComboboxOpen: boolean;
  setPatientComboboxOpen: (open: boolean) => void;
  doctors: Doctor[];
  doctorsLoading: boolean;
}

export function PatientDoctorSection({
  form,
  patients,
  patientsLoading,
  patientSearch,
  setPatientSearch,
  patientComboboxOpen,
  setPatientComboboxOpen,
  doctors,
  doctorsLoading,
}: PatientDoctorSectionProps) {
  return (
    <section className="space-y-4">
      <SectionHeader
        title="Patient & doctor"
        description="Who the appointment is for and who will see them."
      />
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="min-w-0 flex-1">
          <FormField
            control={form.control}
            name="patientId"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Patient</FormLabel>
                <PatientSelector
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  patients={patients}
                  patientsLoading={patientsLoading}
                  patientSearch={patientSearch}
                  setPatientSearch={setPatientSearch}
                  patientComboboxOpen={patientComboboxOpen}
                  setPatientComboboxOpen={setPatientComboboxOpen}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <DoctorSelector
            form={form}
            doctors={doctors}
            doctorsLoading={doctorsLoading}
          />
        </div>
      </div>
    </section>
  );
}

interface WalkInSlotSectionProps {
  slotReady: boolean;
  slotLabel: string;
  doctorId?: string;
}

export function WalkInSlotSection({
  slotReady,
  slotLabel,
  doctorId,
}: WalkInSlotSectionProps) {
  return (
    <section className="space-y-4">
      <SectionHeader
        title="Next available slot"
        description="Auto-selected from the doctor's availability."
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
  );
}

interface ScheduleSectionProps {
  form: UseFormReturn<CreateAppointmentInput>;
  selectedDate?: Date;
  onAdjustSchedulingDate?: (next: Date) => void;
  startHour: number;
  endHour: number;
  isResolvingDefaultSlot: boolean;
  doctorId?: string;
  availabilitySlotsReady: boolean;
  availabilitySlots: AvailableSlot[];
  clinicTimezone: string;
  blockingAppointments: SlotBlockingAppointment[];
  appointmentTypeOptions: SelectOption[];
}

export function ScheduleSection({
  form,
  selectedDate,
  onAdjustSchedulingDate,
  startHour,
  endHour,
  isResolvingDefaultSlot,
  doctorId,
  availabilitySlotsReady,
  availabilitySlots,
  clinicTimezone,
  blockingAppointments,
  appointmentTypeOptions,
}: ScheduleSectionProps) {
  return (
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
            blockingAppointments={blockingAppointments}
          />
        </div>
        <AppointmentFormFields
          form={form}
          appointmentTypeOptions={appointmentTypeOptions}
        />
      </div>
    </section>
  );
}

interface FormActionsSectionProps {
  loading: boolean;
  isResolvingDefaultSlot: boolean;
  mode: "standard" | "walk-in";
  slotReady: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FormActionsSection({
  loading,
  isResolvingDefaultSlot,
  mode,
  slotReady,
  onOpenChange,
}: FormActionsSectionProps) {
  return (
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
        {loading && (
          <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
        )}
        {mode === "walk-in" ? "Add walk-in" : "Schedule"}
      </Button>
    </div>
  );
}
