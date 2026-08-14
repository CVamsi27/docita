"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Appointment,
  AppointmentCancelRequest,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from "@workspace/types";
import { useAPIMutation } from "../../core/use-api-mutation";
import { queryKeys } from "../../lib/query-keys-clinician";

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  return useAPIMutation<Appointment, CreateAppointmentRequest>(
    "/appointments",
    "POST",
    {
      invalidateKeys: [
        queryKeys.appointments.all(),
        queryKeys.doctorAvailabilitySlots.all(),
        // Patient portal reads from a separate key tree; without this,
        // a newly created appointment won't show up on /patient-portal/appointments
        // until the user navigates away and back.
        queryKeys.patientPortal.appointments.all(),
      ],
      onSuccess: async () => {
        await queryClient.refetchQueries({
          queryKey: queryKeys.doctorAvailabilitySlots.all(),
          type: "all",
        });
      },
      suppressGlobalErrorToast: true,
    },
  );
};

export const useUpdateAppointment = (id: string) =>
  useAPIMutation<Appointment, UpdateAppointmentRequest>(
    `/appointments/${id}`,
    "PATCH",
    {
      invalidateKeys: [
        queryKeys.appointments.all(),
        queryKeys.appointments.detail(id),
        queryKeys.doctorAvailabilitySlots.all(),
        queryKeys.patientPortal.appointments.all(),
      ],
      suppressGlobalErrorToast: true,
    },
  );

/** Background consultation draft saves: avoids invalidating detail (prevents refetch/hydrate churn). */
export const useConsultationAutosaveUpdateAppointment = (id: string) =>
  useAPIMutation<Appointment, UpdateAppointmentRequest>(
    `/appointments/${id}`,
    "PATCH",
    {
      invalidateKeys: [],
      suppressGlobalErrorToast: true,
    },
  );

export const useCancelAppointment = (id: string) =>
  useAPIMutation<Appointment, AppointmentCancelRequest>(
    `/appointments/${id}/cancel`,
    "PATCH",
    {
      invalidateKeys: [
        queryKeys.appointments.all(),
        queryKeys.appointments.detail(id),
        queryKeys.doctorAvailabilitySlots.all(),
        queryKeys.patientPortal.appointments.all(),
      ],
    },
  );

export const useCheckInAppointment = () =>
  useAPIMutation<{ success: boolean }, string>(
    (id) => `/queue/check-in/${id}`,
    "POST",
    {
      invalidateKeys: [queryKeys.queue.all(), queryKeys.appointments.all()],
    },
  );
