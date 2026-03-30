"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
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
import { Loader2, Plus, Check, X, Ban } from "lucide-react";
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
import { LeaveType, StaffLeave, LeavePlan } from "@workspace/types";

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  CASUAL: "Casual",
  SICK: "Sick",
  EARNED: "Earned",
  COMP_OFF: "Comp Off",
  UNPAID: "Unpaid",
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

  const [applyForm, setApplyForm] = useState({
    leaveType: "" as LeaveType | "",
    startDate: "",
    endDate: "",
    reason: "",
    staffId: "",
  });

  const [planForm, setPlanForm] = useState({
    leaveType: "" as LeaveType | "",
    annualQuota: "",
    carryForward: false,
    maxCarryForward: "0",
  });

  const handleApplyLeave = async () => {
    if (!applyForm.leaveType || !applyForm.startDate || !applyForm.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await applyLeaveMutation.mutateAsync({
        leaveType: applyForm.leaveType as LeaveType,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        reason: applyForm.reason || undefined,
        staffId: userIsAdmin && applyForm.staffId ? applyForm.staffId : undefined,
      });
      toast.success("Leave request submitted");
      setApplyDialogOpen(false);
      setApplyForm({ leaveType: "", startDate: "", endDate: "", reason: "", staffId: "" });
      refetch();
    } catch {
      toast.error("Failed to submit leave request");
    }
  };

  const handleCreatePlan = async () => {
    if (!planForm.leaveType || !planForm.annualQuota) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await createPlanMutation.mutateAsync({
        leaveType: planForm.leaveType as LeaveType,
        annualQuota: parseInt(planForm.annualQuota, 10),
        carryForward: planForm.carryForward,
        maxCarryForward: parseInt(planForm.maxCarryForward, 10) || 0,
        isActive: true,
      });
      toast.success("Leave plan saved");
      setPlanDialogOpen(false);
      setPlanForm({
        leaveType: "",
        annualQuota: "",
        carryForward: false,
        maxCarryForward: "0",
      });
    } catch {
      toast.error("Failed to save leave plan");
    }
  };

  return (
    <div className="space-y-6">
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
                  <p className="text-2xl font-bold">{b.remaining}</p>
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
            <Button size="sm" onClick={() => setPlanDialogOpen(true)}>
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
                  <SelectValue placeholder="Filter by staff" />
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
            <Button size="sm" onClick={() => setApplyDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Apply for Leave
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {leavesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : leaves.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requests.</p>
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
          <div className="space-y-4 py-2">
            {userIsAdmin && staffMembers.length > 0 && (
              <div className="space-y-1.5">
                <Label>On behalf of (optional)</Label>
                <Select
                  value={applyForm.staffId || "self"}
                  onValueChange={(v) =>
                    setApplyForm((f) => ({
                      ...f,
                      staffId: v === "self" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Myself</SelectItem>
                    {staffMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select
                value={applyForm.leaveType}
                onValueChange={(v) =>
                  setApplyForm((f) => ({ ...f, leaveType: v as LeaveType }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((lt) => (
                    <SelectItem key={lt} value={lt}>
                      {LEAVE_TYPE_LABELS[lt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={applyForm.startDate}
                  onChange={(e) =>
                    setApplyForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={applyForm.endDate}
                  min={applyForm.startDate}
                  onChange={(e) =>
                    setApplyForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Textarea
                value={applyForm.reason}
                onChange={(e) =>
                  setApplyForm((f) => ({ ...f, reason: e.target.value }))
                }
                placeholder="Brief reason for leave..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyLeave}
              disabled={applyLeaveMutation.isPending}
            >
              {applyLeaveMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Plan Dialog */}
      {userIsAdmin && (
        <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Leave Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Leave Type</Label>
                <Select
                  value={planForm.leaveType}
                  onValueChange={(v) =>
                    setPlanForm((f) => ({ ...f, leaveType: v as LeaveType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((lt) => (
                      <SelectItem key={lt} value={lt}>
                        {LEAVE_TYPE_LABELS[lt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Annual Quota (days)</Label>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={planForm.annualQuota}
                  onChange={(e) =>
                    setPlanForm((f) => ({ ...f, annualQuota: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePlan}
                disabled={createPlanMutation.isPending}
              >
                {createPlanMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Plan
              </Button>
            </DialogFooter>
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
                placeholder="Provide a reason..."
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
      toast.error("Failed to approve leave");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync();
      toast.success("Leave cancelled");
      onActionDone();
    } catch {
      toast.error("Failed to cancel leave");
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
            {leave.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {format(new Date(leave.startDate as string), "MMM d, yyyy")} -{" "}
          {format(new Date(leave.endDate as string), "MMM d, yyyy")}
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
                <Loader2 className="h-3 w-3 animate-spin" />
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
                <Loader2 className="h-3 w-3 animate-spin" />
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
      toast.error("Failed to reject leave");
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleReject}
      disabled={rejectMutation.isPending}
    >
      {rejectMutation.isPending && (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      )}
      Reject Leave
    </Button>
  );
}
