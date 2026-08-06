import { useCallback } from "react";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import {
  clinicWallDatetimeLocalToUtcIso,
  utcInstantToClinicWallDatetimeLocal,
} from "@workspace/utils";
import type {
  Appointment,
  CreateAppointmentInput,
} from "@workspace/types";
import { useCreateAppointment } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

interface UseCreateAppointmentSubmitParams {
  form: UseFormReturn<CreateAppointmentInput>;
  defaultDuration: number;
  clinicTimezone: string;
  onAppointmentAdded: (appointment: Appointment) => void | Promise<void>;
}

export function useCreateAppointmentSubmit({
  form,
  defaultDuration,
  clinicTimezone,
  onAppointmentAdded,
}: UseCreateAppointmentSubmitParams) {
  const { mutateAsync: createAppointment, isPending: loading } =
    useCreateAppointment();

  const onSubmit = useCallback(
    async (data: CreateAppointmentInput, onSuccess?: () => void) => {
      try {
        const durationMs = defaultDuration * 60000;

        const startWall =
          typeof data.startTime === "string"
            ? data.startTime.trim()
            : utcInstantToClinicWallDatetimeLocal(data.startTime, clinicTimezone);
        const startUtc = clinicWallDatetimeLocalToUtcIso(
          startWall,
          clinicTimezone,
        );
        const endWallRaw =
          typeof data.endTime === "string" && data.endTime.trim().length > 0
            ? data.endTime.trim()
            : data.endTime instanceof Date
              ? utcInstantToClinicWallDatetimeLocal(data.endTime, clinicTimezone)
              : null;
        const endUtc =
          endWallRaw && endWallRaw.length > 0
            ? clinicWallDatetimeLocalToUtcIso(endWallRaw, clinicTimezone)
            : null;

        if (!startUtc) {
          showUserFacingErrorToast(null, "Enter a valid start time.", "form");
          return;
        }

        const endFinal =
          endUtc ??
          new Date(new Date(startUtc).getTime() + durationMs).toISOString();

        const createdAppointment = await createAppointment({
          ...data,
          startTime: startUtc,
          endTime: endFinal,
        });

        form.reset();
        await onAppointmentAdded(createdAppointment);
        if (onSuccess) {
          await onSuccess();
        }
        toast.success("Appointment scheduled successfully");
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not schedule this appointment. Please try again.",
          "save",
        );
      }
    },
    [
      form,
      onAppointmentAdded,
      createAppointment,
      defaultDuration,
      clinicTimezone,
    ],
  );

  return { onSubmit, loading };
}
