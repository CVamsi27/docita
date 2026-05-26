import { useCallback, useMemo, useState } from "react";
import type { Appointment } from "@workspace/types";
import { useAppointmentForm } from "@/features/appointments/hooks/use-appointment-form";
import { useFormOptions } from "@/lib/contexts/app-config-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { AddAppointmentDialogUI } from "./AddAppointmentDialogUI";

type SelectOption = {
  value: string;
  label: string;
};

interface AddAppointmentDialogContainerProps {
  onAppointmentAdded: (appointment: Appointment) => void | Promise<void>;
  selectedDate?: Date;
  onAdjustSchedulingDate?: (next: Date) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  preselectedPatientId?: string;
  defaultDoctorId?: string;
  mode?: "standard" | "walk-in";
}

export function AddAppointmentDialogContainer({
  onAppointmentAdded,
  selectedDate,
  onAdjustSchedulingDate,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  preselectedPatientId,
  defaultDoctorId,
  mode = "standard",
}: AddAppointmentDialogContainerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (newOpen: boolean) => {
      if (isControlled && controlledOnOpenChange) {
        controlledOnOpenChange(newOpen);
      } else {
        setInternalOpen(newOpen);
      }
    },
    [isControlled, controlledOnOpenChange],
  );

  const { clinic } = useClinic();

  const openingTimeStr = clinic?.openingTime;
  const closingTimeStr = clinic?.closingTime;

  const startHour = openingTimeStr
    ? parseInt(openingTimeStr.split(":")[0] ?? "9", 10)
    : 9;
  const endHour = closingTimeStr
    ? parseInt(closingTimeStr.split(":")[0] ?? "18", 10)
    : 18;

  const appointmentTypeOptions = useFormOptions("appointmentType");
  const mergedAppointmentTypeOptions = useMemo<SelectOption[]>(() => {
    const fallbackOptions: SelectOption[] = [
      { value: "other", label: "Other" },
    ];

    const merged = [...appointmentTypeOptions];
    fallbackOptions.forEach((fallback) => {
      if (!merged.some((option) => option.value === fallback.value)) {
        merged.push(fallback);
      }
    });

    return merged;
  }, [appointmentTypeOptions]);

  const {
    form,
    loading,
    isResolvingDefaultSlot,
    availabilitySlotsReady,
    availabilitySlots,
    clinicTimezone,
    blockingAppointmentsForSlots,
    patients,
    patientsLoading,
    patientSearch,
    setPatientSearch,
    doctors,
    doctorsLoading,
    onSubmit,
  } = useAppointmentForm({
    onAppointmentAdded,
    selectedDate,
    onAdjustSchedulingDate,
    preselectedPatientId,
    defaultDoctorId,
    startHour,
    endHour,
    open,
  });

  return (
    <AddAppointmentDialogUI
      open={open}
      onOpenChange={setOpen}
      mode={mode}
      form={form}
      loading={loading}
      patients={patients}
      patientsLoading={patientsLoading}
      patientSearch={patientSearch}
      setPatientSearch={setPatientSearch}
      doctors={doctors}
      doctorsLoading={doctorsLoading}
      onSubmit={onSubmit}
      appointmentTypeOptions={mergedAppointmentTypeOptions}
      patientComboboxOpen={patientComboboxOpen}
      setPatientComboboxOpen={setPatientComboboxOpen}
      startHour={startHour}
      endHour={endHour}
      isResolvingDefaultSlot={isResolvingDefaultSlot}
      selectedDate={selectedDate}
      availabilitySlotsReady={availabilitySlotsReady}
      availabilitySlots={availabilitySlots}
      clinicTimezone={clinicTimezone}
      blockingAppointmentsForSlots={blockingAppointmentsForSlots}
      onAdjustSchedulingDate={onAdjustSchedulingDate}
    />
  );
}
