"use client";

import {
  AlertTriangle,
  FileText,
  Receipt,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import type { InternalEnterpriseContractRow as EnterpriseContractRow } from "@workspace/data-access/internal";
import { MINIMUM_SETUP_FEE_INR } from "./enterprise-contracts-helpers";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

export type EnterpriseContractRowActionsProps = Pick<
  EnterpriseContractsPageState,
  | "busy"
  | "openEdit"
  | "showMembers"
  | "showEstimate"
  | "showInvoices"
  | "generatePrepay"
  | "generateSetupFeeInvoice"
  | "openCustomBill"
  | "evaluateTrueUp"
  | "showAlerts"
  | "showRevisions"
> & {
  row: EnterpriseContractRow;
};

/**
 * Action-button cluster for a single enterprise-contract table row — split
 * out from `EnterpriseContractsTableSection` because it is a self-contained
 * group of nine row-scoped actions (edit, members, estimate, invoices,
 * billing actions, alerts, revisions).
 */
export function EnterpriseContractRowActions({
  row,
  busy,
  openEdit,
  showMembers,
  showEstimate,
  showInvoices,
  generatePrepay,
  generateSetupFeeInvoice,
  openCustomBill,
  evaluateTrueUp,
  showAlerts,
  showRevisions,
}: EnterpriseContractRowActionsProps) {
  return (
    <div className="space-x-1 text-right">
      <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
        Edit
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => showMembers(row)}
        aria-label="Members"
      >
        <UsersIcon className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void showEstimate(row.id)}
      >
        Estimate
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void showInvoices(row.id)}
        aria-label="Invoices"
      >
        <Receipt className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void generatePrepay(row.id)}
        disabled={row.status !== "ACTIVE" || busy}
      >
        Prepay
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void generateSetupFeeInvoice(row)}
        disabled={row.setupFeeCents < MINIMUM_SETUP_FEE_INR * 100 || busy}
      >
        Setup fee
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => openCustomBill(row)}
        disabled={busy}
      >
        Custom bill
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void evaluateTrueUp(row.id)}
        disabled={row.status !== "ACTIVE" || busy}
        aria-label="Evaluate true-up now"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="outline" onClick={() => void showAlerts(row.id)}>
        Alerts
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void showRevisions(row.id)}
        aria-label="Revisions"
      >
        <FileText className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
