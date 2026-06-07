"use client";

import { formatDate } from "@workspace/utils";
import {
  BaseContractDialogShell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./base-dialog-shell";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsAlertsDialogProps = Pick<EnterpriseContractsPageState, 'alertsOpen' | 'setAlertsOpen' | 'alerts'>;

export function EnterpriseContractsAlertsDialog(props: EnterpriseContractsAlertsDialogProps) {
  const { alertsOpen, setAlertsOpen, alerts } = props;
  return (
    <BaseContractDialogShell
      open={alertsOpen}
      onOpenChange={setAlertsOpen}
      title="True-up alerts"
      description="Daily cron (03:15 UTC) raises one alert per contract per calendar month when YTD spend ≥ threshold% of YTD platform commit."
    >
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No alerts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Observed %</TableHead>
              <TableHead>Threshold %</TableHead>
              <TableHead>YTD overage</TableHead>
              <TableHead>Recipients</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs">
                  {formatDate(a.alertedAt)}
                </TableCell>
                <TableCell>
                  <strong>{a.observedPercent}%</strong>
                </TableCell>
                <TableCell>{a.thresholdPercent}%</TableCell>
                <TableCell>
                  ₹{(a.ytdOverageCents / 100).toFixed(2)}
                </TableCell>
                <TableCell className="text-xs">
                  {a.recipients.join(", ") || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </BaseContractDialogShell>
  );
}
