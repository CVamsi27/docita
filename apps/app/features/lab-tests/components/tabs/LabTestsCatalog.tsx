import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { EmptyState, LoadingState } from "@workspace/ui/components/empty-state";
import { FlaskConical } from "lucide-react";

import { LabTest } from "@workspace/types";

interface LabTestsCatalogProps {
  testCatalog: LabTest[];
  isLoading: boolean;
}

export const LabTestsCatalog: FC<LabTestsCatalogProps> = ({
  testCatalog,
  isLoading,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Catalog</CardTitle>
        <CardDescription>Available lab tests and pricing</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState message="Loading catalog..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {testCatalog.map((test) => (
                  <tr
                    key={test.id}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium">{test.name}</td>
                    <td className="py-3 px-4 text-muted-foreground capitalize">
                      {test.category}
                    </td>
                    <td className="py-3 px-4">
                      {test.price ? `₹${test.price}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
