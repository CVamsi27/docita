import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";
import { createAppointmentSchema, Doctor, Patient } from "@workspace/types";

type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
import type { SelectOption } from "@/lib/app-config-context";

import { Button } from "@workspace/ui/components/button";
import { Form } from "@workspace/ui/components/form";
import { FormDialog } from "@workspace/ui/components/form-dialog";
import { AppointmentFormFields } from "@/features/appointments/components/sections/add-dialog/AppointmentFormFields";
import { PatientSelector } from "@/features/appointments/components/sections/add-dialog/PatientSelector";
import { DoctorSelector } from "@/features/appointments/components/sections/add-dialog/DoctorSelector";
import { TimeSlotPicker } from "@/features/appointments/components/sections/add-dialog/TimeSlotPicker";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

interface AddAppointmentDialogUIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}: AddAppointmentDialogUIProps) {
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
      title="Schedule Appointment"
      description="Pick the patient, doctor, time, and visit type."
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

          <section className="space-y-4">
            <SectionHeader
              title="Schedule & type"
              description="Keep the slot within clinic hours."
            />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <TimeSlotPicker
                form={form}
                startHour={startHour}
                endHour={endHour}
              />
              <AppointmentFormFields
                form={form}
                appointmentTypeOptions={appointmentTypeOptions}
              />
            </div>
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />}
              Schedule
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
