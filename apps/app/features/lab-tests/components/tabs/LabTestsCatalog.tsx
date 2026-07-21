import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  ListRow,
  LoadingState,
  type DataTableColumn
} from "@workspace/ui/components";
import { FlaskConical } from "lucide-react";

import { LabTest } from "@workspace/types";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";

interface LabTestsCatalogProps {
  testCatalog: LabTest[];
  isLoading: boolean;
}

export const LabTestsCatalog: FC<LabTestsCatalogProps> = ({
  testCatalog,
  isLoading,
}) => {
  const { formatCurrency } = useClinicCurrency();

  const columns: DataTableColumn<LabTest>[] = [
    {
      id: "name",
      header: "Name",
      cell: (test) => <span className="font-medium">{test.name}</span>,
    },
    {
      id: "category",
      header: "Category",
      hiddenOnMobile: true,
      cell: (test) => (
        <span className="capitalize text-muted-foreground">{test.category}</span>
      ),
    },
    {
      id: "price",
      header: "Price",
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
        <CardTitle>Test Catalog</CardTitle>
        <CardDescription>Available lab tests and pricing</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState message="Loading catalog…" />
        ) : testCatalog.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title="No tests in catalog"
            description="Lab test catalog will appear here once configured."
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
