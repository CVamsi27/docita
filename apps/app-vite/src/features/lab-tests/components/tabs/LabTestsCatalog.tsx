import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, DataTable, EmptyState, ListRow, LoadingState, type DataTableColumn } from "@workspace/ui/components";
import { FlaskConical } from "lucide-react";
import { LabTest } from "@workspace/types";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";

interface LabTestsCatalogProps {
  testCatalog: LabTest[];
  isLoading: boolean;
}

export const LabTestsCatalog: FC<LabTestsCatalogProps> = ({
  testCatalog,
  isLoading,
}) => {
  const { t } = useTranslation("LabTests");
  const { currency } = useLocaleCurrency();
  const formatCurrency = (amount: number, options?: { fractionDigits?: number }) =>
    formatCurrencyUtil(amount, currency, options ?? {});

  const columns: DataTableColumn<LabTest>[] = [
    {
      id: "name",
      header: t("catalog.name"),
      cell: (test) => <span className="font-medium">{test.name}</span>,
    },
    {
      id: "category",
      header: t("catalog.category"),
      hiddenOnMobile: true,
      cell: (test) => (
        <span className="capitalize text-muted-foreground">{test.category}</span>
      ),
    },
    {
      id: "price",
      header: t("catalog.price"),
      cell: (test) => (
        <span className="font-medium tabular-nums">
          {test.price
            ? formatCurrency(test.price, { fractionDigits: 0 })
            : "—"}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("catalog.title")}</CardTitle>
        <CardDescription>{t("catalog.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState message={t("catalog.loading")} />
        ) : testCatalog.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title={t("catalog.emptyTitle")}
            description={t("catalog.emptyDescription")}
          />
        ) : (
          <DataTable<LabTest>
            columns={columns}
            data={testCatalog}
            rowKey={(test) => test.id}
            stackOnMobile
            mobileRenderer={(test) => (
              <ListRow
                title={test.name}
                meta={
                  <span className="capitalize">{test.category}</span>
                }
                trailing={
                  <span className="font-medium tabular-nums">
                    {test.price
                      ? formatCurrency(test.price, { fractionDigits: 0 })
                      : "—"}
                  </span>
                }
                showChevron={false}
              />
            )}
          />
        )}
      </CardContent>
    </Card>
  );
};
