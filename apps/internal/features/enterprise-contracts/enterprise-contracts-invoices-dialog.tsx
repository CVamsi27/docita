"use client";

import { formatCurrency, formatDate } from "@workspace/utils";
import { useTranslations } from "next-intl";
import { BaseContractDialogShell } from "./base-dialog-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/data-display/table";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsInvoicesDialogProps = Pick<
  EnterpriseContractsPageState,
  "invoicesOpen" | "setInvoicesOpen" | "invoices"
>;

/**
 * Phase 3 (per-feature): apps/internal Enterprise contracts >
 * Invoices dialog. 6 literals converted to
 * useTranslations("InternalEnterpriseContracts.invoicesDialog").
 */
function useInvoicesDialogTranslations() {
  return useTranslations("InternalEnterpriseContracts.invoicesDialog");
}

export function EnterpriseContractsInvoicesDialog(
  props: EnterpriseContractsInvoicesDialogProps,
) {
  const { invoicesOpen, setInvoicesOpen, invoices } = props;
  const t = useInvoicesDialogTranslations();
  return (
    <BaseContractDialogShell
      open={invoicesOpen}
      onOpenChange={setInvoicesOpen}
      title={t("title")}
      description={t("description")}
    >
      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("emptyMessage")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colKind")}</TableHead>
              <TableHead>{t("colPeriod")}</TableHead>
              <TableHead>{t("colAmount")}</TableHead>
              <TableHead>{t("colDiscount")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.kind}</TableCell>
                <TableCell className="text-xs">
                  {t("periodValue", {
                    start: formatDate(inv.periodStart),
                    end: formatDate(inv.periodEnd),
                  })}
                </TableCell>
                <TableCell>
                  {formatCurrency(inv.amountCents / 100, {
                    currency: inv.currency,
                  })}
                </TableCell>
                <TableCell>{t("discountValue", { percent: inv.discountPercent })}</TableCell>
                <TableCell>
                  {inv.subscriptionPayment?.status ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </BaseContractDialogShell>
  );
}
