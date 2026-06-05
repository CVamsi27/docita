"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Button } from "@workspace/ui/components/form/button";
import { Plus, RefreshCw } from "lucide-react";
import { FeatureGate } from "@/components/auth/feature-gate";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";
import { useInvoicesLogic } from "@/features/invoices/hooks/use-invoices-logic";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { Feature } from "@/lib/stores/permission-store";
import { InvoicesFilters } from "./InvoicesFilters";
import { InvoicesTable } from "./InvoicesTable";

export function InvoicesPageUI() {
  const clinicCurrency = useClinicCurrency();
  const {
    invoices,
    filteredInvoices,
    loading,
    isError,
    error,
    filter,
    setFilter,
    sortConfig,
    handleSort,
    handleDownloadPdf,
    handleRefresh,
    searchQuery,
    setSearchQuery,
    refetch,
  } = useInvoicesLogic();

  const formatCurrency = (amount: number | undefined) =>
    clinicCurrency.formatCurrency(amount || 0);

  return (
    <FeatureGate
      feature={Feature.INVOICING}
      fallback={
        <AppPageScaffold>
          <EmptyState
            icon={Receipt}
            title="Invoicing"
            description="Create and manage invoices and billing for your patients. Upgrade to unlock this feature."
            action={{
              label: "Upgrade plan",
              href: SUBSCRIPTION_SETTINGS_PATH,
            }}
            className="min-h-[50vh]"
          />
        </AppPageScaffold>
      }
    >
      <AppPageScaffold
        header={
          <PageHeader
            title="Invoices"
            description="View and manage invoices for your clinic."
            actions={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleRefresh}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <Button asChild className="gap-2">
                  <Link href="/invoices/new">
                    <Plus className="h-4 w-4" />
                    Create Invoice
                  </Link>
                </Button>
              </div>
            }
          />
        }
      >
        {isError ? (
          <DataState
            status="error"
            className="min-h-[40vh]"
            errorMessage={error?.message ?? "We could not load invoices. Please try again."}
            onRetry={() => void refetch()}
          />
        ) : (
          <>
            <InvoicesFilters
              filter={filter}
              setFilter={setFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            <InvoicesTable
              invoices={filteredInvoices}
              loading={loading}
              formatCurrency={formatCurrency}
              sortConfig={sortConfig}
              onSort={handleSort}
              onDownloadPdf={handleDownloadPdf}
            />

            <p className="text-[var(--fs-xs)] text-muted-foreground">
              Showing {filteredInvoices.length} of {invoices.length} invoices
            </p>
          </>
        )}
      </AppPageScaffold>
    </FeatureGate>
  );
}
