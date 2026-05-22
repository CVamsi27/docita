import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
import { queryKeys } from "../lib/query-keys";

export interface DoctorDelayResponse {
  id: string;
  clinicId: string;
  doctorId: string;
  delayMinutes: number;
  reason?: string | null;
  isActive: boolean;
  markedById: string;
  markedAt: string;
  clearedAt?: string | null;
  clearedById?: string | null;
  affectedAppointmentCount: number;
}

export interface MarkDoctorDelayInput {
  doctorId: string;
  delayMinutes: number;
  reason?: string;
}

export function useActiveDelays() {
  return useAPIQuery<DoctorDelayResponse[]>(
    queryKeys.doctorDelays.active(),
    "/doctor-delays",
  );
}

export function useActiveDoctorDelay(doctorId: string | undefined) {
  return useAPIQuery<DoctorDelayResponse | null>(
    queryKeys.doctorDelays.byDoctor(doctorId ?? ""),
    `/doctor-delays/doctor/${doctorId}`,
    { enabled: !!doctorId },
  );
}

export function useMarkDoctorDelay() {
  return useAPIMutation<DoctorDelayResponse, MarkDoctorDelayInput>(
    "/doctor-delays",
    "POST",
    {
      invalidateKeys: [
        queryKeys.doctorDelays.all(),
        queryKeys.appointments.all(),
      ],
    },
  );
}

export function useClearDoctorDelay() {
  return useAPIMutation<{ success: boolean }, string>(
    (id) => `/doctor-delays/${id}`,
    "DELETE",
    {
      invalidateKeys: [queryKeys.doctorDelays.all(), queryKeys.appointments.all()],
      body: () => undefined,
    },
  );
}
