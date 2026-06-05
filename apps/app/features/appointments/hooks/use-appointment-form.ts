import { useMemo } from "react";
import { useForm } from "react-hook-form";
import type { Appointment, CreateAppointmentInput } from "@workspace/types";
import { createAppointmentFormResolver } from "@/features/appointments/lib/appointment-form-resolver.boundary";
import { useAppConfig } from "@/lib/contexts/app-config-context";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useCreateAppointmentSubmit } from "./use-create-appointment-submit";
import { useAppointmentFormPatients } from "./use-appointment-form-patients";
import { useAppointmentFormDoctorState } from "./use-appointment-form-doctor-state";
import { useAppointmentFormScheduling } from "./use-appointment-form-scheduling";
import { useAppointmentFormDefaults } from "./use-appointment-form-lifecycle";
import {
  getClinicTimezoneOrDefault,
  buildCurrentUserForAppointment,
} from "./appointment-form-helpers";

interface UseAppointmentFormProps {
  onAppointmentAdded: (appointment: Appointment) => void | Promise<void>;
  selectedDate?: Date;
  onAdjustSchedulingDate?: (next: Date) => void;
  preselectedPatientId?: string;
  defaultDoctorId?: string;
  startHour?: number;
  endHour?: number;
  open?: boolean;
}

export function useAppointmentForm({
  onAppointmentAdded,
  selectedDate,
  onAdjustSchedulingDate,
  preselectedPatientId,
  defaultDoctorId,
  startHour = 9,
  endHour = 17,
  open,
}: UseAppointmentFormProps) {
  const { clinic } = useClinic();
  const { config } = useAppConfig();
  const { user } = useAuth();
  const clinicTimezone = useMemo(() => getClinicTimezoneOrDefault(clinic), [clinic]);

  const form = useForm<CreateAppointmentInput>({
    resolver: createAppointmentFormResolver(clinicTimezone),
  });
  const watchedDoctorId = form.watch("doctorId");

  const { filteredDoctors, doctorsLoading, unavailableIds, doctorSchedules } =
    useAppointmentFormDoctorState({ selectedDate, open, watchedDoctorId, form });

  useAppointmentFormDefaults({
    form, selectedDate, open, clinicTimezone, startHour, endHour,
    defaultDoctorId, preselectedPatientId, filteredDoctors, unavailableIds,
    currentUser: buildCurrentUserForAppointment(user),
  });

  const { patients, patientsLoading, patientSearch, setPatientSearch } =
    useAppointmentFormPatients({ preselectedPatientId, open, form });

  const { blockingAppointmentsForSlots, slots, availabilitySlotsReady, isResolvingDefaultSlot } =
    useAppointmentFormScheduling({
      open, selectedDate, watchedDoctorId, clinicTimezone,
      doctorSchedules, form, onAdjustSchedulingDate,
    });

  const { onSubmit, loading } = useCreateAppointmentSubmit({
    form,
    defaultDuration: config.defaults.appointmentDuration,
    clinicTimezone,
    onAppointmentAdded,
  });

  return {
    form, loading, isResolvingDefaultSlot, availabilitySlotsReady,
    availabilitySlots: slots, clinicTimezone, blockingAppointmentsForSlots,
    patients, patientsLoading, patientSearch, setPatientSearch,
    doctors: filteredDoctors, doctorsLoading, onSubmit,
  };
}
