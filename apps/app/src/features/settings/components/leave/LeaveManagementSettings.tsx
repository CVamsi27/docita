import { useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { isAdmin } from "@/lib/auth/permissions";
import { useClinicMembers } from "@workspace/data-access";
import { useLeaveBalance } from "@workspace/data-access";
import { LeaveBalanceCard } from "./LeaveBalanceCard";
import { LeavePolicyEditor } from "./LeavePolicyEditor";
import { LeaveSettingsForm } from "./LeaveSettingsForm";

export function LeaveManagementSettings() {
  const { user } = useAuth();
  const userIsAdmin = isAdmin(user?.role);

  const { data: members = [] } = useClinicMembers();
  const staffMembers = useMemo(
    () => members.filter((m) => m.id !== user?.id),
    [members, user?.id],
  );

  const { data: balance = [] } = useLeaveBalance();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 px-4 py-3">
        <span className="ui-eyebrow">Leave vs. time away</span>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit leave here when your clinic tracks quotas and approvals. To
          block the scheduling calendar immediately, use Time away under
          Availability.
        </p>
      </div>

      <LeaveBalanceCard balance={balance} />

      {userIsAdmin && <LeavePolicyEditor />}

      <LeaveSettingsForm
        userIsAdmin={userIsAdmin}
        currentUserId={user?.id}
        staffMembers={staffMembers}
      />
    </div>
  );
}
