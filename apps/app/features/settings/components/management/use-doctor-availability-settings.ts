"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useBulkDoctorSchedules,
  useClinicMembers,
  useDoctorSchedules,
} from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  buildDefaultDaySchedules,
  populateDaySchedulesFromApi,
  type DayOfWeek,
  type DaySchedule,
} from "./doctor-availability-config";

export function useDoctorAvailabilitySettings() {
  const { user, isAdmin } = useAuth();
  const { data: members = [] } = useClinicMembers();

  const doctors = useMemo(
    () =>
      members.filter((m) => m.role === "DOCTOR" || m.role === "ADMIN_DOCTOR"),
    [members],
  );

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("me");

  useEffect(() => {
    if (isAdmin && doctors.length > 0 && selectedDoctorId === "me") {
      setSelectedDoctorId(doctors[0]?.id ?? "me");
    }
  }, [isAdmin, doctors, selectedDoctorId]);

  const targetDoctorId = isAdmin ? selectedDoctorId : "me";

  const { data: schedules, isLoading } = useDoctorSchedules(targetDoctorId);
  const { mutate: bulkSave, isPending: isSaving } = useBulkDoctorSchedules();

  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>(
    buildDefaultDaySchedules,
  );

  useEffect(() => {
    setDaySchedules(populateDaySchedulesFromApi(schedules));
  }, [schedules]);

  const updateDay = (
    day: DayOfWeek,
    patch: Partial<Omit<DaySchedule, "dayOfWeek">>,
  ) => {
    setDaySchedules((prev) =>
      prev.map((d) => (d.dayOfWeek === day ? { ...d, ...patch } : d)),
    );
  };

  const handleSave = () => {
    const payload = daySchedules.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime,
      endTime: d.endTime,
      slotDuration: d.slotDuration,
      isActive: d.isActive,
    }));

    const mutationBody =
      isAdmin && selectedDoctorId !== "me"
        ? { doctorId: selectedDoctorId, schedules: payload }
        : { schedules: payload };

    bulkSave(mutationBody, {
      onSuccess: () => {
        toast.success("Availability updated successfully");
      },
      onError: (err) => {
        showUserFacingErrorToast(
          err,
          "We could not save this doctor's availability. Please try again.",
          "save",
        );
      },
    });
  };

  const selectedDoctorName = useMemo(() => {
    if (!isAdmin || selectedDoctorId === "me") return user?.name || "My";
    return doctors.find((d) => d.id === selectedDoctorId)?.name || "Doctor";
  }, [isAdmin, selectedDoctorId, doctors, user?.name]);

  return {
    isAdmin,
    doctors,
    selectedDoctorId,
    setSelectedDoctorId,
    daySchedules,
    updateDay,
    handleSave,
    isLoading,
    isSaving,
    selectedDoctorName,
  };
}
