import {
  DEFAULT_TIMEZONE,
  formatClinicPickerDayIsoFromSelection,
} from "@workspace/utils";
import { z } from "zod";
import { Feature, availableSlotSchema } from "@workspace/types";
import { queryKeys } from "../lib/query-keys-clinician";
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
import { useAPIQueryValidated } from "../core/use-api-query-validated";
import { withQueryString } from "../lib/query-string";
import { useDataAccessContext } from "../provider/hooks";

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  clinicId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
  doctor?: { id: string; name: string; specialization?: string };
  clinic?: { id: string; name: string };
}

export interface DoctorTimeOff {
  id: string;
  doctorId: string;
  clinicId?: string;
  startDate: string;
  endDate: string;
  reason?: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  doctor?: { id: string; name: string };
  clinic?: { id: string; name: string };
}

export const useDoctorSchedules = (doctorId?: string) => {
  const calendarOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.CALENDAR_SLOTS,
  );
  return useAPIQuery<DoctorSchedule[]>(
    queryKeys.doctorSchedules.list(doctorId || "me"),
    `/doctor-availability/schedules${doctorId ? `?doctorId=${doctorId}` : ""}`,
    { enabled: calendarOk },
  );
};

export const useClinicSchedules = () => {
  const calendarOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.CALENDAR_SLOTS,
  );
  return useAPIQuery<DoctorSchedule[]>(
    queryKeys.doctorSchedules.clinic(),
    "/doctor-availability/schedules/clinic",
    { enabled: calendarOk },
  );
};

export const useCreateDoctorSchedule = () =>
  useAPIMutation<
    DoctorSchedule,
    {
      doctorId?: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      slotDuration?: number;
      isActive?: boolean;
    }
  >("/doctor-availability/schedules", "POST");

export const useBulkDoctorSchedules = () =>
  useAPIMutation<
    { success: boolean },
    {
      doctorId?: string;
      schedules: {
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        slotDuration?: number;
        isActive?: boolean;
      }[];
    }
  >("/doctor-availability/schedules/bulk", "POST");

export const useUpdateDoctorSchedule = (id: string) =>
  useAPIMutation<
    DoctorSchedule,
    {
      startTime?: string;
      endTime?: string;
      slotDuration?: number;
      isActive?: boolean;
    }
  >(`/doctor-availability/schedules/${id}`, "PUT");

export const useDeleteDoctorSchedule = (id: string) =>
  useAPIMutation<{ success: boolean }, void>(
    `/doctor-availability/schedules/${id}`,
    "DELETE",
  );

export const useDoctorTimeOffs = (doctorId?: string, upcoming?: boolean) => {
  const calendarOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.CALENDAR_SLOTS,
  );
  return useAPIQuery<DoctorTimeOff[]>(
    queryKeys.doctorTimeOffs.list(
      doctorId || "me",
      upcoming ? "upcoming" : "all",
    ),
    `/doctor-availability/time-off${doctorId ? `?doctorId=${doctorId}` : ""}${upcoming ? "&upcoming=true" : ""}`,
    { enabled: calendarOk },
  );
};

export const useCreateDoctorTimeOff = () =>
  useAPIMutation<
    DoctorTimeOff,
    {
      doctorId?: string;
      startDate: string;
      endDate: string;
      reason?: string;
      isFullDay?: boolean;
      startTime?: string;
      endTime?: string;
    }
  >("/doctor-availability/time-off", "POST", {
    invalidateKeys: [queryKeys.doctorTimeOffs.all()],
  });

export const useDeleteDoctorTimeOff = (id: string) =>
  useAPIMutation<{ success: boolean }, void>(
    `/doctor-availability/time-off/${id}`,
    "DELETE",
  );

export const useDeleteDoctorTimeOffMutation = () =>
  useAPIMutation<{ success: boolean }, string>(
    (id) => `/doctor-availability/time-off/${id}`,
    "DELETE",
    {
      invalidateKeys: [queryKeys.doctorTimeOffs.all()],
    },
  );

const unavailableDoctorsResponseSchema = z.object({
  doctorIds: z.array(z.string()),
});

const doctorAvailabilitySlotRowSchema = availableSlotSchema.extend({
  specialization: z.string().nullable().optional(),
});

export function useUnavailableDoctorIdsForDate(
  date: Date | undefined,
  queryOptions?: { enabled?: boolean },
) {
  const { getClinicTimezone, isTierFeatureEnabled } = useDataAccessContext();
  const clinicTz = getClinicTimezone()?.trim() || DEFAULT_TIMEZONE;
  const calendarOk = isTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const dateStr = date
    ? formatClinicPickerDayIsoFromSelection(date, clinicTz)
    : "";
  const enabled =
    calendarOk && Boolean(date && dateStr) && (queryOptions?.enabled ?? true);

  return useAPIQueryValidated(
    queryKeys.doctorUnavailability.byDate(dateStr),
    withQueryString("/doctor-availability/time-off/unavailable-doctors", {
      date: dateStr,
    }),
    unavailableDoctorsResponseSchema,
    { enabled },
  );
}

export function useDoctorAvailabilitySlots(
  date: Date | undefined,
  doctorId: string | undefined,
  queryOptions?: { enabled?: boolean },
) {
  const { getClinicTimezone, isTierFeatureEnabled } = useDataAccessContext();
  const clinicTz = getClinicTimezone()?.trim() || DEFAULT_TIMEZONE;
  const calendarOk = isTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const enabled =
    calendarOk && Boolean(date && doctorId) && (queryOptions?.enabled ?? true);
  const dateKey = date
    ? formatClinicPickerDayIsoFromSelection(date, clinicTz)
    : "";

  return useAPIQueryValidated(
    queryKeys.doctorAvailabilitySlots.forDay(dateKey, doctorId ?? ""),
    enabled && date && doctorId
      ? withQueryString("/doctor-availability/slots", {
          date: dateKey,
          doctorId,
        })
      : "/doctor-availability/slots",
    z.array(doctorAvailabilitySlotRowSchema),
    {
      enabled,
      staleTime: 0,
      refetchOnMount: "always",
    },
  );
}
