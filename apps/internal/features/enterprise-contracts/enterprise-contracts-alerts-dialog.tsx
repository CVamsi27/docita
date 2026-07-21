"use client";

import { formatDate } from "@workspace/utils";
import { useTranslations } from "next-intl";
import { BaseContractDialogShell, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./base-dialog-shell";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsAlertsDialogProps = Pick<EnterpriseContractsPageState, 'alertsOpen' | 'setAlertsOpen' | 'alerts'>;

/**
 * Phase 3 (per-feature): apps/internal Enterprise contracts > Alerts
 * dialog. 6 literals converted to
 * useTranslations("InternalEnterpriseContracts.alertsDialog").
 */
function useAlertsDialogTranslations() {
  return useTranslations("InternalEnterpriseContracts.alertsDialog");
}

export function EnterpriseContractsAlertsDialog(props: EnterpriseContractsAlertsDialogProps) {
  const { alertsOpen, setAlertsOpen, alerts } = props;
  const t = useAlertsDialogTranslations();
  return (
    <BaseContractDialogShell
      open={alertsOpen}
      onOpenChange={setAlertsOpen}
      title={t("title")}
      description={t("description")}
    >
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("emptyMessage")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colDate")}</TableHead>
              <TableHead>{t("colObserved")}</TableHead>
              <TableHead>{t("colThreshold")}</TableHead>
              <TableHead>{t("colYtdOverage")}</TableHead>
              <TableHead>{t("colRecipients")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs">
                  {formatDate(a.alertedAt)}
                </TableCell>
                <TableCell>
                  <strong>{t("percentValue", { percent: a.observedPercent })}</strong>
                </TableCell>
                <TableCell>{t("percentValue", { percent: a.thresholdPercent })}</TableCell>
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
