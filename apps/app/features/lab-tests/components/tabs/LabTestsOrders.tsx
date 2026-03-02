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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { LabTestOrder } from "@workspace/types";

interface LabTestsOrdersProps {
  isLoading: boolean;
  filteredTests: LabTestOrder[];
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
      {}
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

      {}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Patient
                    </TableHead>
                    <TableHead>
                      Test Name
                    </TableHead>
                    <TableHead>
                      Category
                    </TableHead>
                    <TableHead>
                      Ordered By
                    </TableHead>
                    <TableHead>
                      Order Date
                    </TableHead>
                    <TableHead>
                      Status
                    </TableHead>
                    <TableHead className="text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        <div className="font-medium">
                          {test.patient
                            ? `${test.patient.firstName} ${test.patient.lastName}`
                            : "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>{test.labTest?.name || "-"}</TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {test.labTest?.category || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {test.doctor?.name || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(test.createdAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={test.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <FileText className="h-4 w-4" />
                          {test.status === "completed"
                            ? "View Results"
                            : "Details"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
