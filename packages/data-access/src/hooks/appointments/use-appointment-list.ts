"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { Feature, listAppointmentsResponseSchema } from "@workspace/types";
import { useAPIQuery } from "../../core/use-api-query";
import { useAPIQueryValidated } from "../../core/use-api-query-validated";
import { queryKeys } from "../../lib/query-keys-clinician";
import { omitEmptyQueryParams, withQueryString } from "../../lib/query-string";
import { useDataAccessContext } from "../../provider/hooks";
import type { AppointmentWithRelations } from "./_types";

type AppointmentQueryOptions = {
  date?: string;
  startDate?: string;
  endDate?: string;
  doctorId?: string;
  search?: string;
  status?: string;
  cursor?: string;
  page?: number;
  sortOrder?: "asc" | "desc";
  limit?: number;
};

const normalizeAppointmentQueryOptions = (
  options?: AppointmentQueryOptions | null,
): AppointmentQueryOptions | undefined => {
  if (!options) return undefined;
  return omitEmptyQueryParams(options);
};

export const useAppointments = (options?: AppointmentQueryOptions | null) => {
  const { isTierFeatureEnabled, getClinicId } = useDataAccessContext();
  const calendarOk = isTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const normalizedOptions = normalizeAppointmentQueryOptions(options);
  const url = withQueryString("/appointments", normalizedOptions);

  return useAPIQueryValidated(
    queryKeys.appointments.list(normalizedOptions),
    url,
    listAppointmentsResponseSchema,
    {
      enabled: calendarOk && options !== null && Boolean(getClinicId()),
      placeholderData: keepPreviousData,
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    },
  );
};

export const useAppointment = (id: string) => {
  const calendarOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.CALENDAR_SLOTS,
  );
  return useAPIQuery<AppointmentWithRelations>(
    queryKeys.appointments.detail(id),
    `/appointments/${id}`,
    { enabled: calendarOk && id.length > 0 },
  );
};

export const usePatientAppointments = (patientId: string) => {
  const calendarOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.CALENDAR_SLOTS,
  );
  return useAPIQueryValidated(
    queryKeys.appointments.byPatient(patientId),
    `/appointments?patientId=${patientId}`,
    listAppointmentsResponseSchema,
    { enabled: calendarOk && !!patientId },
  );
};
