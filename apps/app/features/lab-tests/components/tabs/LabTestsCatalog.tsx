import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { EmptyState, LoadingState } from "@workspace/ui/components/feedback/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Catalog</CardTitle>
        <CardDescription>Available lab tests and pricing</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState message="Loading catalog…" />
        ) : (
          <>
          <div className="mb-4 space-y-3 md:hidden">
            {testCatalog.map((test) => (
              <div key={test.id} className="ui-card-surface flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{test.name}</p>
                  <p className="text-sm capitalize text-muted-foreground">
                    {test.category}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums">
                  {test.price
                    ? formatCurrency(test.price, { fractionDigits: 0 })
                    : "—"}
                </p>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto overscroll-x-contain md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4">
                    Name
                  </TableHead>
                  <TableHead className="py-3 px-4">
                    Category
                  </TableHead>
                  <TableHead className="py-3 px-4">
                    Price
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testCatalog.map((test) => (
                  <TableRow
                    key={test.id}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="py-3 px-4 font-medium">
                      {test.name}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground capitalize">
                      {test.category}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {test.price
                        ? formatCurrency(test.price, { fractionDigits: 0 })
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </>
        )}
        {!isLoading && testCatalog.length === 0 && (
          <EmptyState
            icon={FlaskConical}
            title="No tests found"
            description="The test catalog is empty"
          />
        )}
      </CardContent>
    </Card>
  );
};
