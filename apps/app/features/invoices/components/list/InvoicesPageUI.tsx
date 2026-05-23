"use client";

import { FC, useMemo } from "react";
import Link from "next/link";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Button } from "@workspace/ui/components/form/button";
import { Plus, RefreshCw } from "lucide-react";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useInvoicesLogic } from "@/features/invoices/hooks/use-invoices-logic";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { InvoicesPageFiltersCard } from "./invoices-page-filters-card";
import { InvoicesPageTableCard } from "./invoices-page-table-card";

export const InvoicesPageUI: FC = () => {
  const clinicCurrency = useClinicCurrency();
  const {
    filteredInvoices,
    loading,
    isError,
    error,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    handleDownloadPdf,
    handleRefresh,
    searchQuery,
    setSearchQuery,
    refetch,
  } = useInvoicesLogic();

  const formatCurrency = (amount: number | undefined) =>
    clinicCurrency.formatCurrency(amount || 0);

  const listStatus = useMemo((): "loading" | "error" | "empty" | "success" => {
    if (loading) return "loading";
    if (isError) return "error";
    if (filteredInvoices.length === 0) return "empty";
    return "success";
  }, [loading, isError, filteredInvoices.length]);

  const hasActiveFilters =
    filter !== "all" || searchQuery.trim().length > 0;

  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
    <AppPageScaffold
      header={
        <PageHeader
          title="Invoices"
          description="Recent invoices, newest first, with payment status. Record cash or card at Payment desk when needed."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleRefresh}>
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
      <InvoicesPageFiltersCard
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <InvoicesPageTableCard
        listStatus={listStatus}
        errorMessage={error?.message}
        onRetry={() => void refetch()}
        hasActiveFilters={hasActiveFilters}
        filteredInvoices={filteredInvoices}
        formatCurrency={formatCurrency}
        handleDownloadPdf={handleDownloadPdf}
      />
    </AppPageScaffold>
    </FeatureGate>
  );
};
