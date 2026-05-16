"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useClinicMembers } from "@/hooks/api/use-settings";
import { useLeaveBalance } from "@/hooks/api/use-leaves";
import { LeaveBalanceCard } from "./LeaveBalanceCard";
import { LeavePolicyEditor } from "./LeavePolicyEditor";
import { LeaveSettingsForm } from "./LeaveSettingsForm";

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

  const { data: balance = [] } = useLeaveBalance();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground max-w-3xl">
        Submit leave here when your clinic tracks quotas and approvals. To block
        the scheduling calendar immediately, use Time away under Availability.
      </p>

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
