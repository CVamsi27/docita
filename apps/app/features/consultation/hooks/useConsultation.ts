import { useQuery } from "@tanstack/react-query";
import { consultationApi } from "@/features/consultation/api/consultation.api";
import type { VitalSign } from "@workspace/types";
import { queryKeys } from "@workspace/data-access";
import { useAppMutation } from "@/lib/query-hooks";

export function useConsultation(appointmentId: string) {
  return useQuery({
    queryKey: queryKeys.consultations.byAppointment(appointmentId),
    queryFn: () => consultationApi.getByAppointmentId(appointmentId),
    enabled: !!appointmentId,
  });
}

export function useCreateConsultation() {
  return useAppMutation({
    mutationFn: consultationApi.create,
    invalidateKeys: [queryKeys.consultations.all()],
    successMessage: "Consultation started",
  });
}

export function useUpdateConsultation(id: string) {
  return useAppMutation({
    mutationFn: (data: Record<string, unknown>) =>
      consultationApi.update(id, data),
    invalidateKeys: [queryKeys.consultations.all(), queryKeys.consultations.detail(id)],
    successMessage: "Consultation updated",
  });
}

export function useAddVitals(consultationId: string) {
  return useAppMutation({
    mutationFn: (vitals: VitalSign) =>
      consultationApi.addVitals(consultationId, vitals),
    invalidateKeys: [
      queryKeys.consultations.all(),
      queryKeys.consultations.detail(consultationId),
    ],
    successMessage: "Vitals recorded",
  });
}

export function useCompleteConsultation(id: string) {
  return useAppMutation({
    mutationFn: () => consultationApi.complete(id),
    invalidateKeys: [queryKeys.consultations.all(), queryKeys.consultations.detail(id)],
    successMessage: "Consultation completed",
  });
}
