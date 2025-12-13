import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiHooks } from "@/lib/api-hooks";
import {
  CreateAppointmentInput,
  createAppointmentSchema,
  DEFAULT_TIMEZONE,
  Patient,
  toLocalISOString,
} from "@workspace/types";
import { useAppConfig } from "@/lib/app-config-context";
import { useAuth } from "@/lib/auth-context";

interface UseAppointmentFormProps {
  onAppointmentAdded: () => void;
  selectedDate?: Date;
  preselectedPatientId?: string;
  startHour?: number;
  endHour?: number;
}

export function useAppointmentForm({
  onAppointmentAdded,
  selectedDate,
  preselectedPatientId,
  startHour = 9,
  endHour = 17,
}: UseAppointmentFormProps) {
  const [patientSearch, setPatientSearch] = useState("");
  const { data: searchedPatientsResponse, isLoading: patientsLoading } =
    apiHooks.usePatients({
      search: patientSearch || undefined,
      limit: patientSearch ? 20 : 10, // Show more results when searching
    });

  // Fetch preselected patient separately to ensure it's available
  const { data: preselectedPatient } = apiHooks.usePatient(
    preselectedPatientId || "",
  );

  // Combine preselected patient with search results, avoiding duplicates
  const patients = useMemo(() => {
    const searchedPatients: Patient[] =
      ((searchedPatientsResponse as { items?: Patient[] }) || {}).items || [];
    if (preselectedPatient && preselectedPatientId) {
      const hasPreselected = searchedPatients.some(
        (p) => p.id === preselectedPatientId,
      );
      if (!hasPreselected) {
        return [preselectedPatient, ...searchedPatients];
      }
    }
    return searchedPatients;
  }, [searchedPatientsResponse, preselectedPatient, preselectedPatientId]);
  const { data: doctors = [], isLoading: doctorsLoading } =
    apiHooks.useDoctors();

  // Filter doctors to only include actual doctors (exclude admins)
  const filteredDoctors = useMemo(
    () => doctors.filter((doc) => doc.role === "DOCTOR"),
    [doctors],
  );

  const { mutateAsync: createAppointment, isPending: loading } =
    apiHooks.useCreateAppointment();
  const queryClient = useQueryClient();
  const { config } = useAppConfig();
  const { user } = useAuth();

  // Get default appointment duration from config
  const defaultDuration = config.defaults.appointmentDuration;

  const defaultValues = useMemo(() => {
    let defaultStart = "";

    if (selectedDate) {
      defaultStart = selectedDate.toISOString().slice(0, 16);
    } else {
      // Logic for next available slot
      const now = new Date();

      // Check if we are past closing time
      if (now.getHours() >= endHour) {
        // Move to tomorrow at opening time
        now.setDate(now.getDate() + 1);
        now.setHours(startHour, 0, 0, 0);
      } else {
        // Round to next 15 minutes
        const remainder = 15 - (now.getMinutes() % 15);
        now.setMinutes(now.getMinutes() + remainder);
        now.setSeconds(0);
        now.setMilliseconds(0);

        // If rounding pushed us past closing time, move to tomorrow
        if (now.getHours() >= endHour) {
          now.setDate(now.getDate() + 1);
          now.setHours(startHour, 0, 0, 0);
        } else if (now.getHours() < startHour) {
          // If we are before opening time (e.g. early morning), set to opening time
          now.setHours(startHour, 0, 0, 0);
        }
      }

      // Convert to local ISO string (simple slice for now as we want local time input)
      // Note: simplistic handling, ideally use date-fns and timezone handling
      const offsetMs = now.getTimezoneOffset() * 60 * 1000;
      const localDate = new Date(now.getTime() - offsetMs);
      defaultStart = localDate.toISOString().slice(0, 16);
    }

    // Determine default doctor
    let defaultDoctorId = "";
    if (user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR") {
      // If current user is a doctor, use their ID
      defaultDoctorId = user.id || "";
    } else if (filteredDoctors.length > 0) {
      // Otherwise, use the first available doctor
      defaultDoctorId = filteredDoctors[0]?.id || "";
    }

    return {
      patientId: preselectedPatientId || "",
      doctorId: defaultDoctorId,
      clinicId: user?.clinicId || "",
      startTime: defaultStart,
      endTime: "",
      status: "scheduled" as const,
      type: "consultation" as const,
      notes: "",
    };
  }, [
    preselectedPatientId,
    selectedDate,
    user?.id,
    user?.clinicId,
    user?.role,
    filteredDoctors,
    startHour,
    endHour,
  ]);

  const form = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues,
  });

  // Track last values to detect changes without useEffect
  const lastSelectedDateRef = useRef<Date | undefined>(undefined);
  const lastPreselectedPatientIdRef = useRef<string | undefined>(undefined);

  // Update form when selectedDate changes (without useEffect)
  if (selectedDate !== lastSelectedDateRef.current) {
    lastSelectedDateRef.current = selectedDate;
    if (selectedDate) {
      const start = new Date(selectedDate);
      // Set to opening time as the starting point
      start.setHours(startHour, 0, 0, 0);
      // Use timezone-aware conversion
      const localISOTime = toLocalISOString(start, {
        timezone: DEFAULT_TIMEZONE,
      });
      form.setValue("startTime", localISOTime);
    }
  }

  // Update form when preselectedPatientId changes (without useEffect)
  if (preselectedPatientId !== lastPreselectedPatientIdRef.current) {
    lastPreselectedPatientIdRef.current = preselectedPatientId;
    if (preselectedPatientId) {
      form.setValue("patientId", preselectedPatientId);
    }
  }

  const onSubmit = useCallback(
    async (data: CreateAppointmentInput, onSuccess?: () => void) => {
      try {
        const durationMs = defaultDuration * 60000;

        await createAppointment({
          ...data,
          startTime: new Date(data.startTime).toISOString(),
          endTime: new Date(
            data.endTime ||
              new Date(new Date(data.startTime).getTime() + durationMs),
          ).toISOString(),
        });

        // Invalidate and refetch queries to refresh data immediately
        await queryClient.invalidateQueries({
          queryKey: ["appointments"],
        });
        await queryClient.refetchQueries({
          queryKey: ["appointments"],
          type: "active",
        });

        form.reset();
        await onAppointmentAdded();
        if (onSuccess) {
          await onSuccess();
        }
        toast.success("Appointment scheduled successfully");
      } catch (error) {
        console.error("Failed to create appointment:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to schedule appointment. Please try again.";
        toast.error(errorMessage);
      }
    },
    [form, onAppointmentAdded, createAppointment, defaultDuration, queryClient],
  );

  return {
    form,
    loading,
    patients,
    patientsLoading,
    patientSearch,
    setPatientSearch,
    doctors: filteredDoctors,
    doctorsLoading,
    onSubmit,
  };
}
