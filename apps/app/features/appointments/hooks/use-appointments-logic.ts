import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDoctors } from "@/hooks/api/use-settings";
import {
  useAppointments,
  useCancelAppointment,
  useCheckInAppointment,
  useStartConsultation,
  useUpdateAppointment,
} from "@/hooks/api/use-appointments";
import { useAuth } from "@/lib/auth-context";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { useDebounce } from "@workspace/hooks/use-debounce";
import {
  Appointment,
  isClinicWideAppointmentRole,
  resolveDoctorScopedAppointmentFilter,
} from "@workspace/types";
import { queryKeys } from "@workspace/data-access";

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
  const NON_CANCELLED_APPOINTMENT_STATUSES =
    "scheduled,confirmed,in_progress,completed,no-show";
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingAptId, setCancellingAptId] = useState<string | null>(null);
  const [noShowDialogOpen, setNoShowDialogOpen] = useState(false);
  const [noShowAptId, setNoShowAptId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [startingConsultationId, setStartingConsultationId] = useState<
    string | null
  >(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(
    undefined,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentTimeSlotRef = useRef<HTMLDivElement>(null);

  // Use local calendar day (not UTC) to avoid off-by-one-day queries.
  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : undefined;

  const handleDateSelect = useCallback((next: Date | undefined) => {
    setDate(next ?? new Date());
  }, []);

  const canViewAllDoctors = useMemo(
    () => isClinicWideAppointmentRole(user?.role),
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
  const doctorsList = doctors;

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
    status: NON_CANCELLED_APPOINTMENT_STATUSES,
    limit: 100,
  });

  const appointments = useMemo(() => {
    return appointmentsResponse?.items || [];
  }, [appointmentsResponse]);

  const checkInMutation = useCheckInAppointment();
  const startConsultationMutation = useStartConsultation();

  const cancelAppointmentMutation = useCancelAppointment(cancellingAptId || "");
  const updateAppointmentMutation = useUpdateAppointment(noShowAptId || "");

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
  const appointmentsQueryParams = useMemo(
    () => ({
      ...(selectedDateStr ? { date: selectedDateStr } : {}),
      ...(doctorScope.scopedDoctorId
        ? { doctorId: doctorScope.scopedDoctorId }
        : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      status: NON_CANCELLED_APPOINTMENT_STATUSES,
      limit: 100,
    }),
    [
      debouncedSearch,
      doctorScope.scopedDoctorId,
      NON_CANCELLED_APPOINTMENT_STATUSES,
      selectedDateStr,
    ],
  );
  const appointmentsQueryKey = useMemo(
    () => queryKeys.appointments.list(appointmentsQueryParams),
    [appointmentsQueryParams],
  );
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
    async (appointmentId: string) => {
      setStartingConsultationId(appointmentId);
      try {
        const result = await startConsultationMutation.mutateAsync({
          appointmentId,
        });
        router.push(`/consultation/${result.appointmentId}`);
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not open this consultation right now. Please try again.",
          "save",
        );
      } finally {
        setStartingConsultationId(null);
      }
    },
    [router, startConsultationMutation],
  );

  const handleCheckIn = useCallback(
    async (appointmentId: string) => {
      setCheckingIn(appointmentId);
      try {
        await checkInMutation.mutateAsync(appointmentId);
        toast.success("Patient checked in to queue");
        await refetch();
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not check this patient in. Please try again.",
          "save",
        );
      } finally {
        setCheckingIn(null);
      }
    },
    [checkInMutation, refetch],
  );

  const updateCurrentAppointmentsCache = useCallback(
    (updater: (items: Appointment[]) => Appointment[]) => {
      queryClient.setQueryData(
        appointmentsQueryKey,
        (current:
          | {
              items?: Appointment[];
              count?: number;
              hasMore?: boolean;
              nextCursor?: string | null;
            }
          | undefined) => {
          if (!current?.items) {
            return current;
          }

          const items = updater(current.items);
          return {
            ...current,
            items,
            count: items.length,
          };
        },
      );
    },
    [appointmentsQueryKey, queryClient],
  );

  const handleAppointmentAdded = useCallback(
    async (appointment: Appointment) => {
      const createdDate = format(new Date(appointment.startTime), "yyyy-MM-dd");
      const shouldAppendToCurrentView =
        selectedDateStr === createdDate &&
        (!doctorScope.scopedDoctorId ||
          appointment.doctorId === doctorScope.scopedDoctorId);

      if (shouldAppendToCurrentView) {
        updateCurrentAppointmentsCache((items) => {
          if (items.some((item) => item.id === appointment.id)) {
            return items;
          }

          return [...items, appointment].sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          );
        });
      }

      await refetch();
    },
    [
      doctorScope.scopedDoctorId,
      refetch,
      selectedDateStr,
      updateCurrentAppointmentsCache,
    ],
  );

  const handleCancelAppointment = async (reason: string) => {
    if (!cancellingAptId) return;
    try {
      await cancelAppointmentMutation.mutateAsync({ reason });
      toast.success("Appointment cancelled successfully");
      updateCurrentAppointmentsCache((items) =>
        items.filter((item) => item.id !== cancellingAptId),
      );
      setCancellingAptId(null);
      setCancelDialogOpen(false);
      await refetch();
    } catch {
      showUserFacingErrorToast(
        "We could not cancel this appointment. Please try again.",
      );
    }
  };

  const handleNoShowAppointment = async () => {
    if (!noShowAptId) return;
    try {
      await updateAppointmentMutation.mutateAsync({
        status: "no-show",
      });
      toast.success("Appointment marked as no-show");
      updateCurrentAppointmentsCache((items) =>
        items.map((item) =>
          item.id === noShowAptId
            ? ({ ...item, status: "no-show" } as Appointment)
            : item,
        ),
      );
      setNoShowAptId(null);
      setNoShowDialogOpen(false);
      await refetch();
    } catch {
      showUserFacingErrorToast(
        "We could not mark this appointment as missed. Please try again.",
      );
    }
  };

  return {
    state: {
      date,
      setDate: handleDateSelect,
      checkingIn,
      startingConsultationId,
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
      hasMoreAppointments: Boolean(appointmentsResponse?.hasMore),
      filteredAppointments,
      appointments: uniqueAppointments,
      currentTimeSlot,
      isToday,
      currentTimeSlotRef,
      preselectedPatientId,
      user,
      isPendingMutation:
        cancelAppointmentMutation.isPending || updateAppointmentMutation.isPending,
    },
    handlers: {
      handleCheckIn,
      handleStartConsultation,
      handleAppointmentAdded,
      handleCancelAppointment,
      handleNoShowAppointment,
      setCancellingAptId,
      setNoShowAptId,
      refetch,
    },
  };
};
