import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Input } from "@workspace/ui/components/form/input";
import { FileText, Filter, FlaskConical, Search, X } from "lucide-react";
import { EmptyState, LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";

import { LabTestOrder } from "@workspace/types";
import {
  DATE_FORMAT_OPTIONS_US_SHORT,
  formatDate,
} from "@/lib/formatters";

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
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Enter patient, test, or doctor"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={searchQuery.trim() ? "pl-9 pr-10" : "pl-9"}
            aria-label="Search lab test orders"
          />
          {searchQuery.trim() ? (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <SymbolTooltip label="Clear search">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-muted-foreground" aria-hidden />
                </Button>
              </SymbolTooltip>
            </div>
          ) : null}
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lab Test Orders</CardTitle>
          <CardDescription>
            A list of all laboratory test orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState message="Loading lab tests…" />
          ) : (
            <>
            <div className="mb-4 space-y-3 md:hidden">
              {filteredTests.map((test) => (
                <div key={test.id} className="ui-card-surface space-y-2 p-4">
                  <p className="font-medium">
                    {test.patient
                      ? `${test.patient.firstName} ${test.patient.lastName}`
                      : "Unknown"}
                  </p>
                  <p className="text-sm">{test.labTest?.name || "—"}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">
                      {test.labTest?.category || "—"}
                    </span>
                    <span>
                      {formatDate(test.createdAt, DATE_FORMAT_OPTIONS_US_SHORT)}
                    </span>
                  </div>
                  <StatusBadge status={test.status} />
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto overscroll-x-contain md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Category
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Ordered By
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Order Date
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell className="hidden sm:table-cell text-muted-foreground capitalize">
                        {test.labTest?.category || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {test.doctor?.name || "-"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDate(
                          test.createdAt,
                          DATE_FORMAT_OPTIONS_US_SHORT,
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={test.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <SymbolTooltip
                          label={
                            test.status === "completed"
                              ? "View results"
                              : "Details"
                          }
                        >
                          <Button variant="ghost" size="sm" className="gap-1">
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">
                              {test.status === "completed"
                                ? "View Results"
                                : "Details"}
                            </span>
                          </Button>
                        </SymbolTooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
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
