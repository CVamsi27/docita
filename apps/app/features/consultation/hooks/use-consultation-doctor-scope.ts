import { useEffect, useMemo, useRef, useState } from "react";
import {
  isClinicWideAppointmentRole,
  resolveDoctorScopedAppointmentFilter,
} from "@workspace/types";

interface UseDoctorScopeParams {
  userId?: string;
  userRole?: string;
}

export function useDoctorScope({ userId, userRole }: UseDoctorScopeParams) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>();
  const appliedDefaultDoctorRef = useRef(false);

  useEffect(() => {
    if (appliedDefaultDoctorRef.current || !userId) return;
    if (userRole === "ADMIN_DOCTOR" || userRole === "DOCTOR") {
      setSelectedDoctorId(userId);
    }
    appliedDefaultDoctorRef.current = true;
  }, [userId, userRole]);

  const canViewAllDoctors = isClinicWideAppointmentRole(userRole);
  const doctorScope = useMemo(
    () =>
      resolveDoctorScopedAppointmentFilter({
        role: userRole,
        userId,
        requestedDoctorId: selectedDoctorId,
      }),
    [selectedDoctorId, userId, userRole],
  );

  return {
    selectedDoctorId,
    setSelectedDoctorId,
    doctorId: doctorScope.scopedDoctorId,
    canViewAllDoctors,
  };
}
