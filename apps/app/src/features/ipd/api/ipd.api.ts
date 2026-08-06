import { apiFetch } from "@/lib/api/api-client";
import type {
  Admission,
  AdmitPatientRequest,
  DischargePatientRequest,
  TransferPatientRequest,
} from "@workspace/types";
import type { WardWithRooms } from "../lib/ipd-stats-helpers";

export const ipdApi = {
  getWards: (search: string) =>
    apiFetch<WardWithRooms[]>(
      `/ipd/wards${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),
  getActiveAdmissions: () =>
    apiFetch<Admission[]>("/ipd/admissions?status=ADMITTED"),
  admitPatient: (data: AdmitPatientRequest) =>
    apiFetch<Admission>("/ipd/admissions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  transferPatient: (data: TransferPatientRequest) =>
    apiFetch<Admission>("/ipd/transfers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  dischargePatient: (data: DischargePatientRequest) =>
    apiFetch<Admission>("/ipd/discharges", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
