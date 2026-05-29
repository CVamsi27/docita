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
import { FileText, Filter, Search, X } from "lucide-react";
import { LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-display/data-table";
import { ListRow } from "@workspace/ui/components/data-display/list-row";

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
  const columns: DataTableColumn<LabTestOrder>[] = [
    {
      id: "patient",
      header: "Patient",
      cell: (test) => (
        <span className="font-medium">
          {test.patient
            ? `${test.patient.firstName} ${test.patient.lastName}`
            : "Unknown"}
        </span>
      ),
    },
    {
      id: "testName",
      header: "Test Name",
      cell: (test) => test.labTest?.name || "—",
    },
    {
      id: "category",
      header: "Category",
      hiddenOnMobile: true,
      cell: (test) => (
        <span className="capitalize text-muted-foreground">
          {test.labTest?.category || "—"}
        </span>
      ),
    },
    {
      id: "orderedBy",
      header: "Ordered By",
      hiddenOnMobile: true,
      cell: (test) => (
        <span className="text-muted-foreground">{test.doctor?.name || "—"}</span>
      ),
    },
    {
      id: "orderDate",
      header: "Order Date",
      hiddenOnMobile: true,
      cell: (test) =>
        formatDate(test.createdAt, DATE_FORMAT_OPTIONS_US_SHORT),
    },
    {
      id: "status",
      header: "Status",
      cell: (test) => <StatusBadge status={test.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (test) => (
        <SymbolTooltip
          label={test.status === "completed" ? "View results" : "Details"}
        >
          <Button variant="ghost" size="sm" className="gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">
              {test.status === "completed" ? "View Results" : "Details"}
            </span>
          </Button>
        </SymbolTooltip>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
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
            <DataTable
              columns={columns}
              data={filteredTests}
              rowKey={(test) => test.id}
              emptyTitle="No lab tests found"
              emptyDescription="Lab test orders will appear here"
              stackOnMobile
              mobileRenderer={(test) => (
                <ListRow
                  title={
                    test.patient
                      ? `${test.patient.firstName} ${test.patient.lastName}`
                      : "Unknown"
                  }
                  meta={[
                    test.labTest?.name || "—",
                    test.labTest?.category || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  time={formatDate(test.createdAt, DATE_FORMAT_OPTIONS_US_SHORT)}
                  status={test.status}
                  showChevron={false}
                />
              )}
              className="ui-card-surface"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
