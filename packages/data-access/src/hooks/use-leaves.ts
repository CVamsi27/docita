import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
import {
  Feature,
  StaffLeave,
  LeavePlan,
  LeaveBalance,
  CreateLeaveRequest,
  CreateLeavePlan,
  UpdateLeavePlan,
} from "@workspace/types";
import { useDataAccessContext } from "../provider/hooks";
export const useLeaves = (options?: {
  staffId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const params = new URLSearchParams();
  if (options?.staffId) params.append("staffId", options.staffId);
  if (options?.status) params.append("status", options.status);
  if (options?.startDate) params.append("startDate", options.startDate);
  if (options?.endDate) params.append("endDate", options.endDate);
  const qs = params.toString();
  const leaveOk = useDataAccessContext().isTierFeatureEnabled(Feature.LEAVE_MANAGEMENT);
  return useAPIQuery<StaffLeave[]>(
    ["leaves", "list", options ?? {}] as string[],
    qs ? `/leaves?${qs}` : "/leaves",
    { enabled: leaveOk },
  );
};

export const useLeaveBalance = () => {
  const leaveOk = useDataAccessContext().isTierFeatureEnabled(Feature.LEAVE_MANAGEMENT);
  return useAPIQuery<LeaveBalance[]>(["leaves", "balance"], "/leaves/balance", {
    enabled: leaveOk,
  });
};

export const useApplyLeave = () =>
  useAPIMutation<StaffLeave, CreateLeaveRequest>("/leaves", "POST", {
    invalidateKeys: [["leaves"]],
  });

export const useApproveLeave = (id: string) =>
  useAPIMutation<StaffLeave, void>(`/leaves/${id}/approve`, "PATCH", {
    invalidateKeys: [["leaves"]],
  });

export const useRejectLeave = (id: string) =>
  useAPIMutation<StaffLeave, { rejectionReason: string }>(
    `/leaves/${id}/reject`,
    "PATCH",
    { invalidateKeys: [["leaves"]] },
  );

export const useCancelLeave = (id: string) =>
  useAPIMutation<StaffLeave, void>(`/leaves/${id}/cancel`, "PATCH", {
    invalidateKeys: [["leaves"]],
  });

export const useLeavePlans = () => {
  const leaveOk = useDataAccessContext().isTierFeatureEnabled(Feature.LEAVE_MANAGEMENT);
  return useAPIQuery<LeavePlan[]>(["leave-plans"], "/leave-plans", {
    enabled: leaveOk,
  });
};

export const useCreateLeavePlan = () =>
  useAPIMutation<LeavePlan, CreateLeavePlan>("/leave-plans", "POST", {
    invalidateKeys: [["leave-plans"]],
  });

export const useUpdateLeavePlan = (id: string) =>
  useAPIMutation<LeavePlan, UpdateLeavePlan>(`/leave-plans/${id}`, "PUT", {
    invalidateKeys: [["leave-plans"]],
  });
