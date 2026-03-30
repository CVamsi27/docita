import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useDoctors, useDoctorSchedules } from "@/hooks/api/use-settings";
import {
  useAppointments,
  useCheckInAppointment,
  useUpdateAppointment,
} from "@/hooks/api/use-appointments";
import { useAuth } from "@/lib/auth-context";
import { useClinic } from "@/lib/clinic-context";
import { useDebounce } from "@workspace/hooks/use-debounce";
import {
  Appointment,
  resolveDoctorScopedAppointmentFilter,
} from "@workspace/types";

export const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      slots.push(timeStr);
    }
  }
  return slots;
};

export const TIME_SLOTS = generateTimeSlots();

const getCurrentTimeSlot = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const slotMinutes = Math.floor(minutes / 30) * 30;
  return `${hours.toString().padStart(2, "0")}:${slotMinutes.toString().padStart(2, "0")}`;
};

export const useAppointmentsLogic = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingAptId, setCancellingAptId] = useState<string | null>(null);
  const [noShowDialogOpen, setNoShowDialogOpen] = useState(false);
  const [noShowAptId, setNoShowAptId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(
    undefined,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { user } = useAuth();
  const { clinic } = useClinic();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTimeSlotRef = useRef<HTMLDivElement>(null);

  const selectedDateStr = date ? date.toISOString().split("T")[0] : undefined;

  const canViewAllDoctors = useMemo(
    () =>
      user?.role &&
      ["ADMIN", "ADMIN_DOCTOR", "RECEPTIONIST"].includes(user.role),
    [user?.role],
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
  const { data: doctorSchedules = [] } = useDoctorSchedules(
    doctorScope.scopedDoctorId || undefined,
  );

  const doctorsList = doctors;

  const clinicStartHour = useMemo(() => {
    const t = clinic?.openingTime;
    return t ? parseInt(t.split(":")[0] ?? "9", 10) : 9;
  }, [clinic?.openingTime]);

  const clinicEndHour = useMemo(() => {
    const t = clinic?.closingTime;
    return t ? parseInt(t.split(":")[0] ?? "18", 10) : 18;
  }, [clinic?.closingTime]);

  const { activeStartHour, activeEndHour } = useMemo(() => {
    if (selectedDoctorId && doctorSchedules.length > 0 && date) {
      const days = [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ];
      const dayName = days[date.getDay()];
      const schedule = doctorSchedules.find(
        (s) => s.dayOfWeek === dayName && s.isActive,
      );
      if (schedule) {
        const start = parseInt(schedule.startTime.split(":")[0] ?? "9", 10);
        const end = parseInt(schedule.endTime.split(":")[0] ?? "18", 10);
        return { activeStartHour: start, activeEndHour: end };
      }
    }
    return { activeStartHour: clinicStartHour, activeEndHour: clinicEndHour };
  }, [
    selectedDoctorId,
    doctorSchedules,
    date,
    clinicStartHour,
    clinicEndHour,
  ]);

  const {
    data: appointmentsResponse,
    isLoading: loading,
    isError,
    refetch,
  } = useAppointments({
    ...(selectedDateStr ? { date: selectedDateStr } : {}),
    ...(doctorScope.scopedDoctorId
      ? { doctorId: doctorScope.scopedDoctorId }
      : {}),
    search: debouncedSearch,
  });

  const appointments = useMemo(() => {
    return appointmentsResponse?.items || [];
  }, [appointmentsResponse]);

  const checkInMutation = useCheckInAppointment();

  const updateAppointmentMutation = useUpdateAppointment(
    cancellingAptId || noShowAptId || "",
  );

  const currentAction = searchParams.get("action");
  useEffect(() => {
    if (currentAction === "new") {
      setIsAddDialogOpen(true);
    }
  }, [currentAction]);

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setIsAddDialogOpen(open);
      if (!open) {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("action");
        newParams.delete("patientId");
        router.replace(`/appointments?${newParams.toString()}`);
      }
    },
    [searchParams, router],
  );

  const uniqueAppointments = useMemo(() => {
    const seen = new Set<string>();
    return appointments.filter((apt: Appointment) => {
      if (!apt.id || seen.has(apt.id)) return false;
      seen.add(apt.id);
      return true;
    });
  }, [appointments]);

  const filteredAppointments = useMemo(
    () =>
      [...uniqueAppointments]
        .filter((apt) => apt.status !== "cancelled")
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        ),
    [uniqueAppointments],
  );

  const currentTimeSlot = useMemo(() => getCurrentTimeSlot(), []);
  const isToday = useMemo(() => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, [date]);

  useEffect(() => {
    if (isToday && currentTimeSlotRef.current) {
      setTimeout(() => {
        currentTimeSlotRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [isToday, filteredAppointments]);

  const preselectedPatientId = useMemo(
    () => searchParams.get("patientId") || undefined,
    [searchParams],
  );

  const handleStartConsultation = useCallback(
    (appointmentId: string) => {
      router.push(`/consultation/${appointmentId}`);
    },
    [router],
  );

  const handleCheckIn = useCallback(
    async (appointmentId: string) => {
      setCheckingIn(appointmentId);
      try {
        await checkInMutation.mutateAsync(appointmentId);
        toast.success("Patient checked in to queue");
        await refetch();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to check in",
        );
      } finally {
        setCheckingIn(null);
      }
    },
    [checkInMutation, refetch],
  );

  const handleCancelAppointment = async () => {
    if (!cancellingAptId) return;
    try {
      await updateAppointmentMutation.mutateAsync({
        status: "cancelled",
      });
      toast.success("Appointment cancelled successfully");
      refetch();
    } catch {
      toast.error("Failed to cancel appointment");
    }
  };

  const handleNoShowAppointment = async () => {
    if (!noShowAptId) return;
    try {
      await updateAppointmentMutation.mutateAsync({
        status: "no-show",
      });
      toast.success("Appointment marked as no-show");
      refetch();
    } catch {
      toast.error("Failed to mark appointment as no-show");
    }
  };

  return {
    state: {
      date,
      setDate,
      checkingIn,
      cancelDialogOpen,
      setCancelDialogOpen,
      noShowDialogOpen,
      setNoShowDialogOpen,
      isAddDialogOpen,
      handleDialogChange,
      selectedDoctorId,
      setSelectedDoctorId,
      searchQuery,
      setSearchQuery,
      canViewAllDoctors,
      doctorsList,
      loading,
      isError,
      filteredAppointments,
      appointments: uniqueAppointments,
      currentTimeSlot,
      isToday,
      currentTimeSlotRef,
      preselectedPatientId,
      user,
      isPendingMutation: updateAppointmentMutation.isPending,
      activeStartHour,
      activeEndHour,
    },
    handlers: {
      handleCheckIn,
      handleStartConsultation,
      handleCancelAppointment,
      handleNoShowAppointment,
      setCancellingAptId,
      setNoShowAptId,
      refetch,
    },
  };
};
