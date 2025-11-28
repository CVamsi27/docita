import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiHooks } from "@/lib/api-hooks";
import {
  createAppointmentSchema,
  CreateAppointmentInput,
} from "@workspace/types";
import { useAppConfig } from "@/lib/app-config-context";
import { useAuth } from "@/lib/auth-context";

interface UseAppointmentFormProps {
  onAppointmentAdded: () => void;
  selectedDate?: Date;
  preselectedPatientId?: string;
}

export function useAppointmentForm({
  onAppointmentAdded,
  selectedDate,
  preselectedPatientId,
}: UseAppointmentFormProps) {
  const [patientSearch, setPatientSearch] = useState("");
  const { data: searchedPatients = [], isLoading: patientsLoading } =
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
    if (preselectedPatient && preselectedPatientId) {
      const hasPreselected = searchedPatients.some(
        (p) => p.id === preselectedPatientId,
      );
      if (!hasPreselected) {
        return [preselectedPatient, ...searchedPatients];
      }
    }
    return searchedPatients;
  }, [searchedPatients, preselectedPatient, preselectedPatientId]);
  const { mutateAsync: createAppointment, isPending: loading } =
    apiHooks.useCreateAppointment();
  const { config } = useAppConfig();
  const { user } = useAuth();

  // Get default appointment duration from config
  const defaultDuration = config.defaults.appointmentDuration;

  const defaultValues = useMemo(
    () => ({
      patientId: preselectedPatientId || "",
      startTime: selectedDate ? selectedDate.toISOString().slice(0, 16) : "",
      endTime: "",
      status: "scheduled" as const,
      type: "consultation" as const,
      notes: "",
    }),
    [preselectedPatientId, selectedDate],
  );

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
      start.setHours(9, 0, 0, 0);
      const offset = start.getTimezoneOffset() * 60000;
      const localISOTime = new Date(start.getTime() - offset)
        .toISOString()
        .slice(0, 16);
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
        // Use logged in user's ID as doctorId, or fallback to first doctor
        const doctorId = user?.id || "1";
        const durationMs = defaultDuration * 60000;

        await createAppointment({
          ...data,
          doctorId,
          startTime: new Date(data.startTime).toISOString(),
          endTime: new Date(
            data.endTime ||
              new Date(new Date(data.startTime).getTime() + durationMs),
          ).toISOString(),
        } as CreateAppointmentInput & { doctorId: string });
        form.reset();
        onAppointmentAdded();
        onSuccess?.();
        toast.success("Appointment scheduled successfully");
      } catch (error) {
        console.error("Failed to create appointment:", error);
        toast.error("Failed to schedule appointment. Please try again.");
      }
    },
    [form, onAppointmentAdded, createAppointment, user?.id, defaultDuration],
  );

  return {
    form,
    loading,
    patients,
    patientsLoading,
    patientSearch,
    setPatientSearch,
    onSubmit,
  };
}
