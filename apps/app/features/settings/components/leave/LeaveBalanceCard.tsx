"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import type { LeaveType } from "@workspace/types";

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  CASUAL: "Casual",
  SICK: "Sick",
  EARNED: "Earned",
  COMP_OFF: "Comp Off",
  UNPAID: "Unpaid",
  HOLIDAY: "Holiday",
};

interface LeaveBalance {
  leaveType: LeaveType;
  remaining: number;
  annualQuota: number;
  pending: number;
}

interface LeaveBalanceCardProps {
  balance: LeaveBalance[];
}

export function LeaveBalanceCard({ balance }: LeaveBalanceCardProps) {
  if (balance.length === 0) return null;

  return (
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
  );
}

export { LEAVE_TYPE_LABELS };
