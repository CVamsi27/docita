import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";
import { useTranslation } from "react-i18next";
import type { LeaveType } from "@workspace/types";
import { leaveTypeLabel } from "./leave-type-helpers";

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
  const { t } = useTranslation("Settings");
  if (balance.length === 0) return null;

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle>{t("leaveTypes.myBalance")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {balance.map((b) => (
            <div
              key={b.leaveType}
              className="rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 p-3 text-center"
            >
              <span className="ui-eyebrow mb-1 block">
                {leaveTypeLabel(b.leaveType, t)}
              </span>
              <p className="ui-mono text-[var(--fs-2xl)] font-semibold leading-[var(--lh-tight)]">
                {b.remaining}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("leaveTypes.ofDays", { count: b.annualQuota })}
              </p>
              {b.pending > 0 && (
                <p className="mt-1 text-xs text-warning">
                  {t("leaveTypes.pending", { count: b.pending })}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
