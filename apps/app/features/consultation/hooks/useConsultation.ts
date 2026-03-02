import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { consultationApi } from "@/features/consultation/api/consultation.api";
import type { VitalSign } from "@workspace/types";
import { toast } from "sonner";

export function useConsultation(appointmentId: string) {
  return useQuery({
    queryKey: ["consultations", "appointment", appointmentId],
    queryFn: () => consultationApi.getByAppointmentId(appointmentId),
    enabled: !!appointmentId,
  });
}

export function useCreateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: consultationApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      toast.success("Consultation started");
    },
  });
}

export function useUpdateConsultation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      consultationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      toast.success("Consultation updated");
    },
  });
}

export function useAddVitals(consultationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vitals: VitalSign) =>
      consultationApi.addVitals(consultationId, vitals),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      toast.success("Vitals recorded");
    },
  });
}

export function useCompleteConsultation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => consultationApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      toast.success("Consultation completed");
    },
  });
}
