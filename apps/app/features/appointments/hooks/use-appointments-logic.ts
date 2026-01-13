import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";
import { useAuth, User } from "@/lib/auth-context";
import { useDebounce } from "@/hooks/use-debounce";
import { Appointment, Patient } from "@workspace/types";

// Generate 30-minute time slots for the entire day
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

// Helper to get current time slot
const getCurrentTimeSlot = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const slotMinutes = Math.floor(minutes / 30) * 30;
  return `${hours.toString().padStart(2, "0")}:${slotMinutes.toString().padStart(2, "0")}`;
};

interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

export const useAppointmentsLogic = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  // Dialog states
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTimeSlotRef = useRef<HTMLDivElement>(null);

  const selectedDateStr = date ? date.toISOString().split("T")[0] : undefined;

  // Check if user can view all doctors' calendars
  const canViewAllDoctors = useMemo(
    () =>
      user?.role &&
      ["ADMIN", "ADMIN_DOCTOR", "RECEPTIONIST"].includes(user.role),
    [user?.role],
  );

  // Fetch doctors list
  const { data: doctors = [] } = apiHooks.useDoctors();

  // API now returns strictly doctors
  const doctorsList = doctors;

  const {
    data: appointmentsResponse,
    isLoading: loading,
    refetch,
  } = apiHooks.useAppointments({
    ...(selectedDateStr ? { date: selectedDateStr } : {}),
    ...(canViewAllDoctors && selectedDoctorId
      ? { doctorId: selectedDoctorId }
      : {}),
    search: debouncedSearch,
  });

  const appointments = useMemo(() => {
    return appointmentsResponse?.items || [];
  }, [appointmentsResponse]);

  const checkInMutation = apiHooks.useCheckInAppointment();

  const updateAppointmentMutation = apiHooks.useUpdateAppointment(
    cancellingAptId || noShowAptId || "",
  );

  // Dialog handling from URL
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
    return appointments.filter((apt) => {
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
      filteredAppointments,
      appointments: uniqueAppointments,
      currentTimeSlot,
      isToday,
      currentTimeSlotRef,
      preselectedPatientId,
      user,
      isPendingMutation: updateAppointmentMutation.isPending,
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
