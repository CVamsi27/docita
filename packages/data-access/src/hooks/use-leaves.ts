import { useAPIMutation, useAPIQuery } from "@/lib/api/api-core";
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
    queryKeys.leaves.list(options),
    qs ? `/leaves?${qs}` : "/leaves",
    { enabled: leaveOk },
  );
};

export const useLeaveBalance = () => {
  const leaveOk = useDataAccessContext().isTierFeatureEnabled(Feature.LEAVE_MANAGEMENT);
  return useAPIQuery<LeaveBalance[]>(queryKeys.leaves.balance(), "/leaves/balance", {
    enabled: leaveOk,
  });
};

export const useApplyLeave = () =>
  useAPIMutation<StaffLeave, CreateLeaveRequest>("/leaves", "POST", {
    invalidateKeys: [queryKeys.leaves.all()],
  });

export const useApproveLeave = (id: string) =>
  useAPIMutation<StaffLeave, void>(`/leaves/${id}/approve`, "PATCH", {
    invalidateKeys: [queryKeys.leaves.all()],
  });

export const useRejectLeave = (id: string) =>
  useAPIMutation<StaffLeave, { rejectionReason: string }>(
    `/leaves/${id}/reject`,
    "PATCH",
    { invalidateKeys: [queryKeys.leaves.all()] },
  );

export const useCancelLeave = (id: string) =>
  useAPIMutation<StaffLeave, void>(`/leaves/${id}/cancel`, "PATCH", {
    invalidateKeys: [queryKeys.leaves.all()],
  });

export const useLeavePlans = () => {
  const leaveOk = useDataAccessContext().isTierFeatureEnabled(Feature.LEAVE_MANAGEMENT);
  return useAPIQuery<LeavePlan[]>(queryKeys.leavePlans.all(), "/leave-plans", {
    enabled: leaveOk,
  });
};

export const useCreateLeavePlan = () =>
  useAPIMutation<LeavePlan, CreateLeavePlan>("/leave-plans", "POST", {
    invalidateKeys: [queryKeys.leavePlans.all()],
  });

export const useUpdateLeavePlan = (id: string) =>
  useAPIMutation<LeavePlan, UpdateLeavePlan>(`/leave-plans/${id}`, "PUT", {
    invalidateKeys: [queryKeys.leavePlans.all()],
  });
