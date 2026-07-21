"use client";

import {
  AppPageScaffold,
  Button,
  PageHeader
} from "@workspace/ui/components";
import { Plus, RefreshCw } from "lucide-react";
import { EnterpriseContractsDialogs } from "./enterprise-contracts-dialogs";
import { getEnterpriseContractsDialogProps } from "./enterprise-contracts-dialog-props";
import { EnterpriseContractsSummarySection } from "./enterprise-contracts-summary-section";
import { EnterpriseContractsTableSection } from "./enterprise-contracts-table-section";
import { useEnterpriseContractsPage } from "./use-enterprise-contracts-page";

export function EnterpriseContractsPage() {
  const page = useEnterpriseContractsPage();

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Enterprise Contracts"
          description="Per-clinic and multi-clinic group contracts for the ENTERPRISE tier"
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => void page.load()}
                disabled={page.refreshing}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={page.openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                New contract
              </Button>
            </div>
          }
        />
      }
    >
      <EnterpriseContractsSummarySection
        totals={page.totals}
        error={page.error}
      />
      <EnterpriseContractsTableSection
        rows={page.rows}
        contractsTableStatus={page.contractsTableStatus}
        contractsLoadError={page.contractsLoadError}
        contractsQuery={page.contractsQuery}
        busy={page.busy}
        openEdit={page.openEdit}
        showMembers={page.showMembers}
        showEstimate={page.showEstimate}
        showInvoices={page.showInvoices}
        generatePrepay={page.generatePrepay}
        generateSetupFeeInvoice={page.generateSetupFeeInvoice}
        openCustomBill={page.openCustomBill}
        evaluateTrueUp={page.evaluateTrueUp}
        showAlerts={page.showAlerts}
        showRevisions={page.showRevisions}
      />
      <EnterpriseContractsDialogs
        {...getEnterpriseContractsDialogProps(page)}
      />
    </AppPageScaffold>
  );
}
