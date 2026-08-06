import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";
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
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle>My leave balance</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {balance.map((b) => (
            <div
              key={b.leaveType}
              className="rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 p-3 text-center"
            >
              <span className="ui-eyebrow mb-1 block">
                {LEAVE_TYPE_LABELS[b.leaveType]}
              </span>
              <p className="ui-mono text-[var(--fs-2xl)] font-semibold leading-[var(--lh-tight)]">
                {b.remaining}
              </p>
              <p className="text-xs text-muted-foreground">
                of {b.annualQuota} days
              </p>
              {b.pending > 0 && (
                <p className="mt-1 text-xs text-warning">{b.pending} pending</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export { LEAVE_TYPE_LABELS };
