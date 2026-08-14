"use client";

import { keepPreviousData } from "@tanstack/react-query";
import {
  BookFollowUpRequest,
  Feature,
  FollowUpResponse,
  ListFollowUpsQuery,
} from "@workspace/types";
import { useAPIQuery } from "../../core/use-api-query";
import { useAPIMutation } from "../../core/use-api-mutation";
import { queryKeys } from "../../lib/query-keys-clinician";
import { omitEmptyQueryParams, withQueryString } from "../../lib/query-string";
import { useDataAccessContext } from "../../provider/hooks";

export const useFollowUps = (options?: ListFollowUpsQuery | null) => {
  const calendarOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.CALENDAR_SLOTS,
  );
  const normalizedOptions = options ? omitEmptyQueryParams(options) : undefined;
  return useAPIQuery<FollowUpResponse[]>(
    queryKeys.followUps.list(normalizedOptions ?? {}),
    withQueryString("/follow-ups", normalizedOptions),
    {
      enabled: calendarOk && options !== null,
      placeholderData: keepPreviousData,
    },
  );
};

export const useCompleteFollowUp = () =>
  useAPIMutation<FollowUpResponse, { id: string }>(
    ({ id }) => `/follow-ups/${id}/complete`,
    "PATCH",
    {
      body: () => undefined,
      invalidateKeys: [queryKeys.followUps.all()],
    },
  );

export const useCancelFollowUp = () =>
  useAPIMutation<FollowUpResponse, { id: string }>(
    ({ id }) => `/follow-ups/${id}/cancel`,
    "PATCH",
    {
      body: () => undefined,
      invalidateKeys: [queryKeys.followUps.all()],
    },
  );

export const useBookFollowUp = () =>
  useAPIMutation<FollowUpResponse, BookFollowUpRequest & { id: string }>(
    ({ id }) => `/follow-ups/${id}/book`,
    "PATCH",
    {
      body: ({ id: _id, ...body }) => body,
      invalidateKeys: [queryKeys.followUps.all(), queryKeys.appointments.all()],
    },
  );
