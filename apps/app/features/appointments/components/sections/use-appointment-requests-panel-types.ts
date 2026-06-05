"use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  useAppointmentRequests,
  useDoctors,
} from "@workspace/data-access";
import type { ApproveScheduleFieldKey } from "@/lib/utils/appointment-request-approve-errors";

export type RequestTextById = Record<string, string>;
export type ApproveFieldErrorsByRequest = Record<
  string,
  Partial<Record<ApproveScheduleFieldKey, string>>
>;
export type DoctorOption = NonNullable<
  ReturnType<typeof useDoctors>["data"]
>[number];

export interface RequestFormState {
  doctorByRequest: RequestTextById;
  setDoctorByRequest: Dispatch<SetStateAction<RequestTextById>>;
  startByRequest: RequestTextById;
  setStartByRequest: Dispatch<SetStateAction<RequestTextById>>;
  rejectReasonByRequest: RequestTextById;
  setRejectReasonByRequest: Dispatch<SetStateAction<RequestTextById>>;
  rejectCustomByRequest: RequestTextById;
  setRejectCustomByRequest: Dispatch<SetStateAction<RequestTextById>>;
  approveFieldErrorsByRequest: ApproveFieldErrorsByRequest;
  setApproveFieldErrorsByRequest: Dispatch<
    SetStateAction<ApproveFieldErrorsByRequest>
  >;
}

export interface AppointmentRequestQueries {
  data: ReturnType<typeof useAppointmentRequests>["data"];
  isLoading: boolean;
  isError: boolean;
  refetch: ReturnType<typeof useAppointmentRequests>["refetch"];
  approvedRequestsData: ReturnType<typeof useAppointmentRequests>["data"];
  isApprovedRequestsLoading: boolean;
  isApprovedRequestsError: boolean;
  refetchApprovedRequests: ReturnType<typeof useAppointmentRequests>["refetch"];
  rejectedRequestsData: ReturnType<typeof useAppointmentRequests>["data"];
  isRejectedRequestsLoading: boolean;
  isRejectedRequestsError: boolean;
  refetchRejectedRequests: ReturnType<typeof useAppointmentRequests>["refetch"];
}
