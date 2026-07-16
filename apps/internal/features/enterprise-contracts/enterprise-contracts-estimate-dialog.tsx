"use client";

import { formatCurrency, formatDate } from "@workspace/utils";
import { useTranslations } from "next-intl";
// jscpd:ignore-start
import {
  BaseContractDialogShell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./base-dialog-shell";
// jscpd:ignore-end
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsEstimateDialogProps = Pick<EnterpriseContractsPageState, 'estimateOpen' | 'setEstimateOpen' | 'estimate' | 'estimateLoading'>;

/**
 * Phase 3 (per-feature): apps/internal Enterprise contracts > Estimate
 * dialog. 9 literals converted to
 * useTranslations("InternalEnterpriseContracts.estimate").
 */
function useEstimateTranslations() {
  return useTranslations("InternalEnterpriseContracts.estimate");
}

export function EnterpriseContractsEstimateDialog(props: EnterpriseContractsEstimateDialogProps) {
  const { estimateOpen, setEstimateOpen, estimate, estimateLoading } = props;
  const t = useEstimateTranslations();
  return (
    <BaseContractDialogShell
      open={estimateOpen}
      onOpenChange={setEstimateOpen}
      title={t("title")}
      description={t("description")}
    >
      {estimateLoading || !estimate ? (
        <p className="text-sm text-muted-foreground">{t("loadingLabel")}</p>
      ) : (
        <div className="space-y-3 text-sm">
          <p>
            {t("periodLabel", {
              start: formatDate(estimate.period.start),
              end: formatDate(estimate.period.end),
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("memberClinicCount", {
              count: estimate.contract.memberClinicIds.length,
            })}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colMeter")}</TableHead>
                <TableHead className="text-right">{t("colUsed")}</TableHead>
                <TableHead className="text-right">{t("colIncluded")}</TableHead>
                <TableHead className="text-right">{t("colOverage")}</TableHead>
                <TableHead className="text-right">{t("colCharge")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(estimate.meters).map(([k, m]) => (
                <TableRow key={k}>
                  <TableCell>{k}</TableCell>
                  <TableCell className="text-right">{m.current}</TableCell>
                  <TableCell className="text-right">{m.included}</TableCell>
                  <TableCell className="text-right">{m.overage}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(m.chargeCents / 100, {
                      currency: estimate.currency,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between border-t pt-2">
            <span>{t("platformFeeLabel")}</span>
            <strong>
              {formatCurrency(estimate.platformFeeCents / 100, {
                currency: estimate.currency,
              })}
            </strong>
          </div>
          <div className="flex justify-between">
            <span>{t("overageTotalLabel")}</span>
            <strong>
              {formatCurrency(estimate.overageTotalCents / 100, {
                currency: estimate.currency,
              })}
            </strong>
          </div>
          <div className="flex justify-between text-base">
            <span>{t("projectedTotalLabel")}</span>
            <strong>
              {formatCurrency(estimate.projectedMonthTotalCents / 100, {
                currency: estimate.currency,
              })}
            </strong>
          </div>
        </div>
      )}
    </BaseContractDialogShell>
  );
}
