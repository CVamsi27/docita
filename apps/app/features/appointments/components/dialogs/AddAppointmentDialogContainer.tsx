import { useCallback, useState } from "react";
import { useAppointmentForm } from "@/hooks/use-appointment-form";
import { useFormOptions } from "@/lib/app-config-context";
import { useClinic } from "@/lib/clinic-context";
import { AddAppointmentDialogUI } from "./AddAppointmentDialogUI";

interface AddAppointmentDialogContainerProps {
  onAppointmentAdded: () => void;
  selectedDate?: Date;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  preselectedPatientId?: string;
}

export function AddAppointmentDialogContainer({
  onAppointmentAdded,
  selectedDate,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  preselectedPatientId,
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

  const {
    form,
    loading,
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
    preselectedPatientId,
    startHour,
    endHour,
  });

  return (
    <AddAppointmentDialogUI
      open={open}
      onOpenChange={setOpen}
      form={form}
      loading={loading}
      patients={patients}
      patientsLoading={patientsLoading}
      patientSearch={patientSearch}
      setPatientSearch={setPatientSearch}
      doctors={doctors}
      doctorsLoading={doctorsLoading}
      onSubmit={onSubmit}
      appointmentTypeOptions={appointmentTypeOptions}
      patientComboboxOpen={patientComboboxOpen}
      setPatientComboboxOpen={setPatientComboboxOpen}
      startHour={startHour}
      endHour={endHour}
    />
  );
}
