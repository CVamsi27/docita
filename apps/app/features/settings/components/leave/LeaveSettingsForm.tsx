"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { useLeaves } from "@/hooks/api/use-leaves";
import type { StaffLeave, User } from "@workspace/types";
import { ApplyLeaveDialog } from "./ApplyLeaveDialog";
import { LeaveRequestRow } from "./LeaveRequestRow";
import { RejectLeaveDialog } from "./RejectLeaveDialog";

interface LeaveSettingsFormProps {
  userIsAdmin: boolean;
  currentUserId?: string;
  staffMembers: Pick<User, "id" | "name">[];
}

export function LeaveSettingsForm({
  userIsAdmin,
  currentUserId,
  staffMembers,
}: LeaveSettingsFormProps) {
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const leavesQuery = useLeaves(
    userIsAdmin && staffFilter !== "all" ? { staffId: staffFilter } : undefined,
  );
  const {
    data: leaves = [],
    isLoading: leavesLoading,
    refetch,
  } = leavesQuery;

  return (
    <>
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
            <Button size="sm" onClick={() => setApplyDialogOpen(true)}>
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
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
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
                  currentUserId={currentUserId}
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

      <ApplyLeaveDialog
        open={applyDialogOpen}
        onOpenChange={setApplyDialogOpen}
        userIsAdmin={userIsAdmin}
        staffMembers={staffMembers}
        onSuccess={() => refetch()}
      />

      {userIsAdmin && (
        <RejectLeaveDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          leaveId={rejectingLeaveId}
          rejectionReason={rejectionReason}
          onReasonChange={setRejectionReason}
          onDone={() => {
            setRejectDialogOpen(false);
            setRejectionReason("");
            setRejectingLeaveId(null);
            refetch();
          }}
        />
      )}
    </>
  );
}
