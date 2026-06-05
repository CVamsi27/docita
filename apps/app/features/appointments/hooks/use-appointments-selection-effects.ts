import { useEffect, useRef, type RefObject } from "react";

type AppointmentUser = {
  id?: string;
  role?: string;
} | null | undefined;

function isDoctorDefaultRole(role: string | undefined): boolean {
  return role === "ADMIN_DOCTOR" || role === "DOCTOR";
}

export function useDefaultDoctorSelection(
  user: AppointmentUser,
  setSelectedDoctorId: (doctorId: string | undefined) => void,
): void {
  const appliedDefaultDoctorRef = useRef(false);

  useEffect(() => {
    if (appliedDefaultDoctorRef.current || !user?.id) return;
    if (isDoctorDefaultRole(user.role)) {
      setSelectedDoctorId(user.id);
    }
    appliedDefaultDoctorRef.current = true;
  }, [setSelectedDoctorId, user?.id, user?.role]);
}

export function useClearUnavailableDoctorSelection(
  selectedDoctorId: string | undefined,
  unavailableDoctorIds: Set<string>,
  setSelectedDoctorId: (doctorId: string | undefined) => void,
): void {
  useEffect(() => {
    if (selectedDoctorId && unavailableDoctorIds.has(selectedDoctorId)) {
      setSelectedDoctorId(undefined);
    }
  }, [selectedDoctorId, setSelectedDoctorId, unavailableDoctorIds]);
}

export function useScrollToCurrentTimeSlot({
  isToday,
  currentTimeSlotRef,
  dependencyToken,
}: {
  isToday: boolean;
  currentTimeSlotRef: RefObject<HTMLDivElement | null>;
  dependencyToken: unknown;
}): void {
  useEffect(() => {
    if (!isToday || !currentTimeSlotRef.current) return;
    setTimeout(() => {
      currentTimeSlotRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }, [isToday, currentTimeSlotRef, dependencyToken]);
}
