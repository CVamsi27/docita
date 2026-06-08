"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  Feature,
  listAppointmentsResponseSchema,
} from "@workspace/types";
import {
  DEFAULT_TIMEZONE,
  formatClinicTodayPickerIso,
} from "@workspace/utils";
import { useAPIQueryValidated } from "../../core/use-api-query-validated";
import { queryKeys } from "../../lib/query-keys-clinician";
import { omitEmptyQueryParams, withQueryString } from "../../lib/query-string";
import { useDataAccessContext } from "../../provider/hooks";

type AppointmentListQueryOptions = {
  limit?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
};

const normalizeListOptions = (
  options?: AppointmentListQueryOptions | null,
): AppointmentListQueryOptions | undefined => {
  if (!options) return undefined;
  return omitEmptyQueryParams(options);
};

export const useTodayAppointments = (enabled: boolean = true) => {
  const { getClinicTimezone, isTierFeatureEnabled } = useDataAccessContext();
  const calendarOk = isTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const tz = getClinicTimezone()?.trim() || DEFAULT_TIMEZONE;
  const today = formatClinicTodayPickerIso(tz);
  return useAPIQueryValidated(
    queryKeys.appointments.list({ date: today }),
    `/appointments?date=${today}`,
    listAppointmentsResponseSchema,
    {
      enabled: calendarOk && enabled,
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
    },
  );
};

export const useInfiniteAppointments = (options?: {
  limit?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) => {
  const normalizedOptions = normalizeListOptions(options);
  const { fetcher, isTierFeatureEnabled } = useDataAccessContext();
  const calendarOk = isTierFeatureEnabled(Feature.CALENDAR_SLOTS);

  return useInfiniteQuery<
    ReturnType<typeof listAppointmentsResponseSchema.parse>,
    Error,
    ReturnType<typeof listAppointmentsResponseSchema.parse>,
    ReturnType<typeof queryKeys.appointments.infinite>,
    string | undefined
  >({
    queryKey: queryKeys.appointments.infinite(normalizedOptions),
    queryFn: ({ pageParam }) => {
      return fetcher(
        withQueryString("/appointments", {
          ...normalizedOptions,
          limit: options?.limit ?? 50,
          cursor: pageParam,
        }),
      ).then((data: unknown) => listAppointmentsResponseSchema.parse(data));
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 1000 * 60 * 2,
    enabled: calendarOk,
  });
};
