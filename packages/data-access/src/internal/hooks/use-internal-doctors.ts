import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";
import type { InternalDashboardClinic } from "../dashboard.types";

/** Doctor list row for internal portal (detail fields loaded separately). */
export interface InternalDoctorListItem {
  id: string;
  name: string;
  email: string;
  clinicId?: string;
  specialization?: string;
  hospitalRole?: string;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  phoneNumber?: string;
  verificationStatus?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export function useInternalDoctorsList(
  token: string | null | undefined,
  selectedClinic: string,
  clinics: InternalDashboardClinic[],
  options?: Omit<
    UseQueryOptions<InternalDoctorListItem[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.doctorsList(
      selectedClinic || "none",
      clinics.length,
    ),
    queryFn: async () => {
      if (selectedClinic === "all") {
        const allDoctorsArrays = await Promise.all(
          clinics.map(async (clinic) => {
            const clinicDoctors = await fetcher<InternalDoctorListItem[]>(
              `/internal/clinics/${clinic.id}/doctors`,
            );
            return (clinicDoctors ?? []).map((doctor) => ({
              ...doctor,
              clinicId: clinic.id,
            }));
          }),
        );
        return allDoctorsArrays.flat();
      }

      if (!selectedClinic) return [];

      const data = await fetcher<InternalDoctorListItem[]>(
        `/internal/clinics/${selectedClinic}/doctors`,
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(token && selectedClinic),
    ...options,
  });
}
