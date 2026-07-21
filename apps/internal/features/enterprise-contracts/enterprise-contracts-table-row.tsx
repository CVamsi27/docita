"use client";

import { useTranslations } from "next-intl";
import { formatCurrency, formatDate } from "@workspace/utils";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { TableCell, TableRow } from "@workspace/ui/components/data-display/table";
import type { InternalEnterpriseContractRow as EnterpriseContractRow } from "@workspace/data-access/internal";
import { enterpriseContractStatusBadgeClass } from "./enterprise-contracts-helpers";
import {
  EnterpriseContractRowActions,
  type EnterpriseContractRowActionsProps,
} from "./enterprise-contracts-row-actions";

export type EnterpriseContractTableRowProps = Omit<
  EnterpriseContractRowActionsProps,
  "row"
> & {
  row: EnterpriseContractRow;
};

/**
 * Single table row for the enterprise-contracts list: contract identity,
 * member/status/period/fee cells, and the row-actions cluster — split out
 * from `EnterpriseContractsTableSection` so the table shell only owns the
 * header and the `rows.map(...)` composition.
 */
function contractStatusKey(status: string): string {
  switch (status) {
    case "DRAFT":
    case "ACTIVE":
    case "EXPIRED":
    case "TERMINATED":
      return `contractStatus${status}`;
    default:
      return status;
  }
}

function billingCycleKey(cycle: string): string {
  switch (cycle) {
    case "MONTHLY":
      return "cycleMonthly";
    case "YEARLY":
      return "cycleYearly";
    default:
      return cycle;
  }
}

export function EnterpriseContractTableRow({
  row,
  ...actionProps
}: EnterpriseContractTableRowProps) {
  const t = useTranslations("InternalEnterpriseContracts.tableSection");
  return (
    <TableRow>
      <TableCell className="text-xs">
        <div className="font-mono">{row.contractNumber}</div>
        {row.groupName && (
          <div className="text-muted-foreground">{row.groupName}</div>
        )}
      </TableCell>
      <TableCell className="font-mono text-xs">{row.primaryClinicId}</TableCell>
      <TableCell>
        <Badge variant="outline">{row.memberClinicIds.length}</Badge>
      </TableCell>
      <TableCell>
        <Badge className={enterpriseContractStatusBadgeClass[row.status]}>
          {t(contractStatusKey(row.status)) || row.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs">
        {formatDate(row.startDate)} → {formatDate(row.endDate)}
      </TableCell>
      <TableCell>
        {formatCurrency(row.platformFeeCents / 100, { currency: row.currency })}
        <span className="text-xs text-muted-foreground">
          {" "}
          / {t(billingCycleKey(row.billingCycle), { defaultValue: row.billingCycle.toLowerCase() })}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <EnterpriseContractRowActions row={row} {...actionProps} />
      </TableCell>
    </TableRow>
  );
}
