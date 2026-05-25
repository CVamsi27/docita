"use client";

import { formatDate } from "@workspace/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsAlertsDialogProps = Pick<EnterpriseContractsPageState, 'alertsOpen' | 'setAlertsOpen' | 'alerts'>;

export function EnterpriseContractsAlertsDialog(props: EnterpriseContractsAlertsDialogProps) {
  const { alertsOpen, setAlertsOpen, alerts } = props;
  return (
    <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>True-up alerts</DialogTitle>
            <DialogDescription>
              Daily cron (03:15 UTC) raises one alert per contract per calendar
              month when YTD spend ≥ threshold% of YTD platform commit.
            </DialogDescription>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
  );
}
