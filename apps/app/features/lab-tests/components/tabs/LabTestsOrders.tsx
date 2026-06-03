import { getPatientFullName } from "@workspace/utils";
import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { SearchInput } from "@workspace/ui/components/form/search-input";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { FileText, Filter } from "lucide-react";
import { LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-display/data-table";
import { ListRow } from "@workspace/ui/components/data-display/list-row";

import { LabTestOrder } from "@workspace/types";
import { DATE_FORMAT_OPTIONS_US_SHORT, formatDate } from "@/lib/formatters";

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
          {test.patient ? getPatientFullName(test.patient) : "Unknown"}
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
        <span className="text-muted-foreground">
          {test.doctor?.name || "—"}
        </span>
      ),
    },
    {
      id: "orderDate",
      header: "Order Date",
      hiddenOnMobile: true,
      cell: (test) => formatDate(test.createdAt, DATE_FORMAT_OPTIONS_US_SHORT),
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
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
          placeholder="Enter patient, test, or doctor"
          ariaLabel="Search lab test orders"
        />
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
                    test.patient ? getPatientFullName(test.patient) : "Unknown"
                  }
                  meta={[
                    test.labTest?.name || "—",
                    test.labTest?.category || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  time={formatDate(
                    test.createdAt,
                    DATE_FORMAT_OPTIONS_US_SHORT,
                  )}
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
