"use client";

import { keepPreviousData } from "@tanstack/react-query";
import {
  ApproveAppointmentRequest,
  AppointmentRequestListResponse,
  AppointmentRequestResponse,
  Feature,
  ListAppointmentRequestsQuery,
  RejectAppointmentRequest,
} from "@workspace/types";
import { useAPIQuery } from "../../core/use-api-query";
import { useAPIMutation } from "../../core/use-api-mutation";
import { queryKeys } from "../../lib/query-keys-clinician";
import { omitEmptyQueryParams, withQueryString } from "../../lib/query-string";
import { useDataAccessContext } from "../../provider/hooks";

export const useAppointmentRequests = (
  options?: ListAppointmentRequestsQuery | null,
) => {
  const calendarOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.CALENDAR_SLOTS,
  );
  const normalizedOptions = options ? omitEmptyQueryParams(options) : undefined;
  return useAPIQuery<AppointmentRequestListResponse>(
    queryKeys.appointmentRequests.list(normalizedOptions ?? {}),
    withQueryString("/appointment-requests", normalizedOptions),
    {
      enabled: calendarOk && options !== null,
      placeholderData: keepPreviousData,
    },
  );
};

export const useApproveAppointmentRequest = () =>
  useAPIMutation<
    AppointmentRequestResponse,
    ApproveAppointmentRequest & { id: string }
  >(({ id }) => `/appointment-requests/${id}/approve`, "PATCH", {
    body: ({ id: _id, ...body }) => body,
    invalidateKeys: [
      queryKeys.appointmentRequests.all(),
      queryKeys.appointments.all(),
      queryKeys.patientPortal.appointments.all(),
      queryKeys.doctorAvailabilitySlots.all(),
    ],
    suppressGlobalErrorToast: true,
  });

export const useRejectAppointmentRequest = () =>
  useAPIMutation<
    AppointmentRequestResponse,
    RejectAppointmentRequest & { id: string }
  >(({ id }) => `/appointment-requests/${id}/reject`, "PATCH", {
    body: ({ id: _id, ...body }) => body,
    invalidateKeys: [queryKeys.appointmentRequests.all()],
    suppressGlobalErrorToast: true,
  });
