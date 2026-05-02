"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDate } from "@workspace/utils";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { DatePicker } from "@workspace/ui/components/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Plus, Check, X, Ban } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useClinicMembers } from "@/hooks/api/use-settings";
import {
  useLeaves,
  useLeaveBalance,
  useApplyLeave,
  useApproveLeave,
  useRejectLeave,
  useCancelLeave,
  useLeavePlans,
  useCreateLeavePlan,
} from "@/hooks/api/use-leaves";
import {
  LeaveType,
  StaffLeave,
  LeavePlan,
  createLeaveRequestSchema,
} from "@workspace/types";
import type { z } from "zod";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { leavePlanDialogSchema } from "@/features/settings/schemas/leave-plan-dialog.schema";
import type { LeavePlanDialogFormValues } from "@/features/settings/schemas/leave-plan-dialog.schema";
import { Skeleton } from "@workspace/ui/components/skeleton";

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  CASUAL: "Casual",
  SICK: "Sick",
  EARNED: "Earned",
  COMP_OFF: "Comp Off",
  UNPAID: "Unpaid",
  HOLIDAY: "Holiday",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};

const isAdminRole = (role?: string) =>
  role === "ADMIN" || role === "ADMIN_DOCTOR";

type ApplyLeaveFormValues = z.infer<typeof createLeaveRequestSchema>;

const defaultApplyLeaveValues: ApplyLeaveFormValues = {
  leaveType: "CASUAL",
  startDate: "",
  endDate: "",
  reason: "",
  staffId: undefined,
};

const defaultLeavePlanValues: LeavePlanDialogFormValues = {
  leaveType: "CASUAL",
  annualQuota: 12,
};

export function LeaveManagementSettings() {
  const { user } = useAuth();
  const userIsAdmin = isAdminRole(user?.role);

  const { data: members = [] } = useClinicMembers();

  const staffMembers = useMemo(
    () => members.filter((m) => m.id !== user?.id),
    [members, user?.id],
  );

  const [staffFilter, setStaffFilter] = useState<string>("all");

  const leavesQuery = useLeaves(
    userIsAdmin && staffFilter !== "all" ? { staffId: staffFilter } : undefined,
  );
  const { data: leaves = [], isLoading: leavesLoading, refetch } = leavesQuery;

  const { data: balance = [] } = useLeaveBalance();
  const { data: plans = [] } = useLeavePlans();

  const applyLeaveMutation = useApplyLeave();
  const createPlanMutation = useCreateLeavePlan();

  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const applyLeaveForm = useForm<ApplyLeaveFormValues>({
    resolver: zodResolver(createLeaveRequestSchema),
    defaultValues: defaultApplyLeaveValues,
  });

  const leavePlanForm = useForm<LeavePlanDialogFormValues>({
    resolver: zodResolver(leavePlanDialogSchema),
    defaultValues: defaultLeavePlanValues,
  });

  const submitApplyLeave = applyLeaveForm.handleSubmit(async (data) => {
    try {
      await applyLeaveMutation.mutateAsync({
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason?.trim() || undefined,
        staffId:
          userIsAdmin && data.staffId?.trim()
            ? data.staffId.trim()
            : undefined,
      });
      toast.success("Leave request submitted");
      setApplyDialogOpen(false);
      applyLeaveForm.reset(defaultApplyLeaveValues);
      refetch();
    } catch {
      showUserFacingErrorToast(
        "We could not submit this leave request. Please try again.",
      );
    }
  });

  const submitLeavePlan = leavePlanForm.handleSubmit(async (data) => {
    try {
      await createPlanMutation.mutateAsync({
        leaveType: data.leaveType,
        annualQuota: data.annualQuota,
        carryForward: false,
        maxCarryForward: 0,
        isActive: true,
      });
      toast.success("Leave plan saved");
      setPlanDialogOpen(false);
      leavePlanForm.reset(defaultLeavePlanValues);
    } catch {
      showUserFacingErrorToast(
        "We could not save this leave plan. Please try again.",
      );
    }
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground max-w-3xl">
        Submit leave here when your clinic tracks quotas and approvals. To block
        the scheduling calendar immediately, use Time away under Availability.
      </p>
      {balance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Leave Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {balance.map((b) => (
                <div
                  key={b.leaveType}
                  className="rounded-lg border border-border p-3 text-center"
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {LEAVE_TYPE_LABELS[b.leaveType]}
                  </p>
                  <p className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {b.remaining}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    of {b.annualQuota} days
                  </p>
                  {b.pending > 0 && (
                    <p className="text-xs text-warning mt-1">
                      {b.pending} pending
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {userIsAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Leave Plans</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                leavePlanForm.reset(defaultLeavePlanValues);
                setPlanDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Configure Plan
            </Button>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No leave plans configured. Create plans to set annual quotas.
              </p>
            ) : (
              <div className="space-y-2">
                {plans.map((plan: LeavePlan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {LEAVE_TYPE_LABELS[plan.leaveType]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {plan.annualQuota} days/year
                        {plan.carryForward &&
                          ` • Carry forward: up to ${plan.maxCarryForward} days`}
                      </p>
                    </div>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            {userIsAdmin ? "All Leave Requests" : "My Leave Requests"}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {userIsAdmin && staffMembers.length > 0 && (
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {staffMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              size="sm"
              onClick={() => {
                applyLeaveForm.reset(defaultApplyLeaveValues);
                setApplyDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Apply for Leave
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {leavesLoading ? (
            <div
              className="space-y-3 py-2"
              role="status"
              aria-live="polite"
              aria-label="Loading leave requests"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-16 w-full rounded-lg"
                />
              ))}
            </div>
          ) : leaves.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requests</p>
          ) : (
            <div className="space-y-2">
              {leaves.map((leave: StaffLeave) => (
                <LeaveRequestRow
                  key={leave.id}
                  leave={leave}
                  userIsAdmin={userIsAdmin}
                  currentUserId={user?.id}
                  onActionDone={() => refetch()}
                  onReject={(id) => {
                    setRejectingLeaveId(id);
                    setRejectDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply Leave Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <Form {...applyLeaveForm}>
            <form onSubmit={submitApplyLeave} className="space-y-4 py-2">
              {userIsAdmin && staffMembers.length > 0 && (
                <FormField
                  control={applyLeaveForm.control}
                  name="staffId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>On behalf of (optional)</FormLabel>
                      <Select
                        value={field.value || "self"}
                        onValueChange={(v) =>
                          field.onChange(v === "self" ? undefined : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Staff member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="self">Myself</SelectItem>
                          {staffMembers.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={applyLeaveForm.control}
                name="leaveType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Leave type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map(
                          (lt) => (
                            <SelectItem key={lt} value={lt}>
                              {LEAVE_TYPE_LABELS[lt]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={applyLeaveForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value || undefined}
                          onChange={(date) => {
                            const next =
                              date?.toISOString().slice(0, 10) ?? "";
                            field.onChange(next);
                            const end = applyLeaveForm.getValues("endDate");
                            if (
                              end &&
                              date &&
                              new Date(end) < new Date(next)
                            ) {
                              applyLeaveForm.setValue("endDate", "");
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={applyLeaveForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value || undefined}
                          minDate={
                            applyLeaveForm.watch("startDate")
                              ? new Date(applyLeaveForm.watch("startDate"))
                              : undefined
                          }
                          onChange={(date) =>
                            field.onChange(
                              date?.toISOString().slice(0, 10) ?? "",
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={applyLeaveForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Reason for leave"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApplyDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={applyLeaveMutation.isPending}
                >
                  {applyLeaveMutation.isPending && (
                    <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                  )}
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Configure Plan Dialog */}
      {userIsAdmin && (
        <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Leave Plan</DialogTitle>
            </DialogHeader>
            <Form {...leavePlanForm}>
              <form onSubmit={submitLeavePlan} className="space-y-4 py-2">
                <FormField
                  control={leavePlanForm.control}
                  name="leaveType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leave Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Leave type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map(
                            (lt) => (
                              <SelectItem key={lt} value={lt}>
                                {LEAVE_TYPE_LABELS[lt]}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={leavePlanForm.control}
                  name="annualQuota"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Quota (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          {...field}
                          value={Number.isFinite(field.value) ? field.value : ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? NaN
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPlanDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPlanMutation.isPending}
                  >
                    {createPlanMutation.isPending && (
                      <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                    )}
                    Save Plan
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      {userIsAdmin && (
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Leave Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 py-2">
              <Label>Reason for rejection</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRejectDialogOpen(false)}
              >
                Cancel
              </Button>
              <RejectButton
                leaveId={rejectingLeaveId!}
                reason={rejectionReason}
                onDone={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason("");
                  setRejectingLeaveId(null);
                  refetch();
                }}
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function LeaveRequestRow({
  leave,
  userIsAdmin,
  currentUserId,
  onActionDone,
  onReject,
}: {
  leave: StaffLeave;
  userIsAdmin: boolean;
  currentUserId?: string;
  onActionDone: () => void;
  onReject: (id: string) => void;
}) {
  const approveMutation = useApproveLeave(leave.id!);
  const cancelMutation = useCancelLeave(leave.id!);

  const isOwn = leave.staffId === currentUserId;

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync();
      toast.success("Leave approved");
      onActionDone();
    } catch {
      showUserFacingErrorToast(
        "We could not approve this leave request. Please try again.",
      );
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync();
      toast.success("Leave cancelled");
      onActionDone();
    } catch {
      showUserFacingErrorToast(
        "We could not cancel this leave request. Please try again.",
      );
    }
  };

  return (
    <div className="flex items-start justify-between p-3 rounded-lg border border-border">
      <div className="flex-1 min-w-0">
        {userIsAdmin && leave.staff && (
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            {leave.staff.name}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">
            {LEAVE_TYPE_LABELS[leave.leaveType]}
          </span>
          <Badge variant={STATUS_VARIANT[leave.status] ?? "secondary"}>
            {humanizeUiLabel(leave.status)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDate(leave.startDate as string, "MMM d, yyyy")} -{" "}
          {formatDate(leave.endDate as string, "MMM d, yyyy")}
        </p>
        {leave.reason && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {leave.reason}
          </p>
        )}
        {leave.rejectionReason && (
          <p className="text-xs text-destructive mt-0.5">
            Rejected: {leave.rejectionReason}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 ml-2 shrink-0">
        {leave.status === "PENDING" && userIsAdmin && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <DocitaLoadingIndicator variant="inline" decorative iconClassName="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() => onReject(leave.id!)}
            >
              <X className="h-3 w-3" />
              Reject
            </Button>
          </>
        )}
        {(leave.status === "PENDING" || leave.status === "APPROVED") &&
          isOwn && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <DocitaLoadingIndicator variant="inline" decorative iconClassName="h-3 w-3" />
              ) : (
                <Ban className="h-3 w-3" />
              )}
              Cancel
            </Button>
          )}
      </div>
    </div>
  );
}

function RejectButton({
  leaveId,
  reason,
  onDone,
}: {
  leaveId: string;
  reason: string;
  onDone: () => void;
}) {
  const rejectMutation = useRejectLeave(leaveId);

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({ rejectionReason: reason });
      toast.success("Leave rejected");
      onDone();
    } catch {
      showUserFacingErrorToast(
        "We could not reject this leave request. Please try again.",
      );
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleReject}
      disabled={rejectMutation.isPending}
    >
      {rejectMutation.isPending && (
        <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
      )}
      Reject Leave
    </Button>
  );
}
