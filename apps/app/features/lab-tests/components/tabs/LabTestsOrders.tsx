import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { FileText, Filter, FlaskConical, Search } from "lucide-react";
import { EmptyState, LoadingState } from "@workspace/ui/components/empty-state";
import { StatusBadge } from "@workspace/ui/components/status-badge";

interface LabTestsOrdersProps {
  isLoading: boolean;
  filteredTests: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const LabTestsOrders: FC<LabTestsOrdersProps> = ({
  isLoading,
  filteredTests,
  searchQuery,
  setSearchQuery,
}) => {
  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient, test, or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Lab Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lab Test Orders</CardTitle>
          <CardDescription>
            A list of all laboratory test orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState message="Loading lab tests..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Patient
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Test Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Ordered By
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Order Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map((test: any) => (
                    <tr
                      key={test.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium">
                          {test.patient
                            ? `${test.patient.firstName} ${test.patient.lastName}`
                            : "Unknown"}
                        </div>
                      </td>
                      <td className="py-3 px-4">{test.labTest?.name || "-"}</td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">
                        {test.labTest?.category || "-"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {test.doctor?.name || "-"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {formatDate(test.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={test.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <FileText className="h-4 w-4" />
                          {test.status === "completed"
                            ? "View Results"
                            : "Details"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && filteredTests.length === 0 && (
            <EmptyState
              icon={FlaskConical}
              title="No lab tests found"
              description="Lab test orders will appear here"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
