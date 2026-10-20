import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Receipt } from "lucide-react";
import { AppPageScaffold, Button, DataState, EmptyState, PageHeader } from "@workspace/ui/components";
import { Plus, RefreshCw } from "lucide-react";
import { FeatureGate } from "@/components/auth/feature-gate";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";
import { useInvoicesLogic } from "@/features/invoices/hooks/use-invoices-logic";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { Feature } from "@workspace/types";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { InvoicesFilters } from "./InvoicesFilters";
import { InvoicesTable } from "./InvoicesTable";

export function InvoicesPageUI() {
  const { t } = useTranslation("Invoices");
  const navigate = useNavigate();
  const { currency } = useLocaleCurrency();
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
    formatCurrencyUtil(amount || 0, currency);

  return (
    <FeatureGate
      feature={Feature.INVOICING}
      fallback={
        <AppPageScaffold
          header={
            <PageHeader
              title={t("pageTitle")}
              description={t("pageDescription")}
            />
          }
        >
          <EmptyState
            icon={Receipt}
            title={t("upgradeFallback.title")}
            description={t("upgradeFallback.description")}
            action={{
              label: t("upgradeFallback.upgradeButton"),
              onClick: () => navigate(SUBSCRIPTION_SETTINGS_PATH),
            }}
            className="min-h-[50vh]"
          />
        </AppPageScaffold>
      }
    >
      <AppPageScaffold
        header={
          <PageHeader
            title={t("pageTitle")}
            description={t("pageDescription")}
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
                  {t("refreshButton")}
                </Button>
                <Button className="gap-2" onClick={() => navigate("/invoices/new")}>
                  <Plus className="h-4 w-4" />
                  {t("createInvoiceButton")}
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
            errorMessage={error?.message ?? t("error")}
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
              {t("showing", { filtered: filteredInvoices.length, total: invoices.length })}
            </p>
          </>
        )}
      </AppPageScaffold>
    </FeatureGate>
  );
}
