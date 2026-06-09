import { useMemo, useState } from "react";
import {
  useDoctors,
  useUnavailableDoctorIdsForDate,
} from "@workspace/data-access";
import {
  isClinicWideAppointmentRole,
  resolveDoctorScopedAppointmentFilter,
} from "@workspace/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import {
  useClearUnavailableDoctorSelection,
  useDefaultDoctorSelection,
} from "./use-appointments-selection-effects";

export function useAppointmentDoctorState(date: Date) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(
    undefined,
  );
  const { user } = useAuth();
  const { clinic, clinicId: contextClinicId } = useClinic();

  useDefaultDoctorSelection(user, setSelectedDoctorId);

  const resolvedClinicId =
    clinic?.id ?? contextClinicId ?? user?.clinicId ?? undefined;
  const canViewAllDoctors = useMemo(
    () => isClinicWideAppointmentRole(user?.role),
    [user?.role],
// jscpd:ignore-start
  );
  const doctorScope = useMemo(
    () =>
      resolveDoctorScopedAppointmentFilter({
        role: user?.role,
        userId: user?.id,
        requestedDoctorId: selectedDoctorId,
      }),
    [selectedDoctorId, user?.id, user?.role],
  );

  const { data: doctors = [] } = useDoctors();
// jscpd:ignore-end
  const { data: unavailableDoctorResponse } =
    useUnavailableDoctorIdsForDate(date);
  const unavailableDoctorIds = useMemo(
    () => new Set(unavailableDoctorResponse?.doctorIds ?? []),
    [unavailableDoctorResponse?.doctorIds],
  );
  const doctorsList = useMemo(
    () => doctors.filter((doctor) => !unavailableDoctorIds.has(doctor.id)),
    [doctors, unavailableDoctorIds],
  );

  useClearUnavailableDoctorSelection(
    selectedDoctorId,
    unavailableDoctorIds,
    setSelectedDoctorId,
  );

  return {
    user,
    clinic,
    resolvedClinicId,
    selectedDoctorId,
    setSelectedDoctorId,
    canViewAllDoctors,
    doctorScope,
    doctorsList,
  };
}
