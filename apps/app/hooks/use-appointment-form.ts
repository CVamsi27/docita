import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { usePatient, usePatients } from "@/hooks/api/use-patients";
import { useDoctors } from "@/hooks/api/use-settings";
import { useCreateAppointment } from "@/hooks/api/use-appointments";
import {
  CreateAppointmentInput,
  createAppointmentSchema,
  Patient,
} from "@workspace/types";
import { DEFAULT_TIMEZONE, toLocalISOString } from "@workspace/utils";
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
    usePatients({
      search: patientSearch || undefined,
      limit: patientSearch ? 20 : 10,
    });

  const { data: preselectedPatient } = usePatient(preselectedPatientId || "");

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

  const lastSinglePatientIdRef = useRef<string | null>(null);
  const { data: doctors = [], isLoading: doctorsLoading } = useDoctors();

  const filteredDoctors = doctors;

  const { mutateAsync: createAppointment, isPending: loading } =
    useCreateAppointment();
  const queryClient = useQueryClient();
  const { config } = useAppConfig();
  const { user } = useAuth();

  const defaultDuration = config.defaults.appointmentDuration;

  const defaultValues = useMemo(() => {
    let defaultStart = "";

    if (selectedDate) {
      defaultStart = selectedDate.toISOString().slice(0, 16);
    } else {
      const now = new Date();

      if (now.getHours() < startHour) {
        now.setHours(startHour, 0, 0, 0);
      } else if (now.getHours() >= endHour) {
        now.setDate(now.getDate() + 1);
        now.setHours(startHour, 0, 0, 0);
      } else {
        const remainder = 30 - (now.getMinutes() % 30);
        if (remainder === 0) {
          now.setMinutes(now.getMinutes() + 30);
        } else {
          now.setMinutes(now.getMinutes() + remainder);
        }
        now.setSeconds(0);
        now.setMilliseconds(0);

        if (now.getHours() >= endHour) {
          now.setDate(now.getDate() + 1);
          now.setHours(startHour, 0, 0, 0);
        }
      }

      const offsetMs = now.getTimezoneOffset() * 60 * 1000;
      const localDate = new Date(now.getTime() - offsetMs);
      defaultStart = localDate.toISOString().slice(0, 16);
    }

    let defaultDoctorId = "";
    if (user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR") {
      defaultDoctorId = user.id || "";
    } else if (filteredDoctors.length > 0) {
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
    resolver: zodResolver(
      createAppointmentSchema,
    ) as Resolver<CreateAppointmentInput>,
    defaultValues,
  });

  const lastSelectedDateRef = useRef<Date | undefined>(undefined);
  const lastPreselectedPatientIdRef = useRef<string | undefined>(undefined);

  if (selectedDate !== lastSelectedDateRef.current) {
    lastSelectedDateRef.current = selectedDate;
    if (selectedDate) {
      const start = new Date(selectedDate);
      start.setHours(startHour, 0, 0, 0);
      const localISOTime = toLocalISOString(start, {
        timezone: DEFAULT_TIMEZONE,
      });
      form.setValue("startTime", localISOTime);
    }
  }

  if (preselectedPatientId !== lastPreselectedPatientIdRef.current) {
    lastPreselectedPatientIdRef.current = preselectedPatientId;
    if (preselectedPatientId) {
      form.setValue("patientId", preselectedPatientId);
    }
  }

  const currentPatientId = form.watch("patientId");
  if (
    !preselectedPatientId &&
    !currentPatientId &&
    patients.length === 1 &&
    patients[0]?.id &&
    lastSinglePatientIdRef.current !== patients[0].id
  ) {
    lastSinglePatientIdRef.current = patients[0].id;
    form.setValue("patientId", patients[0].id);
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
