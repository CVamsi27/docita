import { FC } from "react";
import { RefreshCw } from "lucide-react";
import { getPatientFullName } from "@workspace/utils";
import type { LabQueueItem } from "@workspace/data-access";
import { AppPageScaffold, Button, DataState, DataTable, PageHeader, SearchInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge, type DataTableColumn } from "@workspace/ui/components";
import { DATE_FORMAT_OPTIONS_US_SHORT, formatDate } from "@/lib/formatters";
import { useLabWorkspace, type LabQueueStatusFilter } from "@/features/lab-tests/hooks/use-lab-workspace";
import { LabOrderRowActions } from "@/features/lab-tests/components/workspace/lab-order-row-actions";

const STATUS_OPTIONS: { value: LabQueueStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "ORDERED", label: "Ordered" },
  { value: "SAMPLE_COLLECTED", label: "Sample collected" },
  { value: "PENDING", label: "In lab" },
  { value: "RESULT_READY", label: "Result ready" },
  { value: "COMPLETED", label: "Released" },
  { value: "CANCELLED", label: "Cancelled" },
];

function toStatusTone(status: string): string {
  return status.toLowerCase().replace(/_/g, "-");
}

interface LabWorkspaceUIProps {
  /** Front-desk / admin viewers may verify payment; lab technicians may not. */
  canVerifyPayment?: boolean;
}

export const LabWorkspaceUI: FC<LabWorkspaceUIProps> = ({
  canVerifyPayment = false,
}) => {
  const {
    queue,
    status,
    isFetching,
    refetch,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    handleRecordSample,
    handleUploadResult,
    handleVerifyPayment,
    handleRelease,
    isMutating,
  } = useLabWorkspace({ canVerifyPayment });

  const columns: DataTableColumn<LabQueueItem>[] = [
    {
      id: "patient",
      header: "Patient",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{getPatientFullName(row.patient)}</span>
          <span className="text-xs text-muted-foreground">
            {row.patient.phoneNumber ?? "No phone"}
          </span>
        </div>
      ),
    },
    {
      id: "test",
      header: "Test",
      cell: (row) => (
        <div className="flex flex-col">
          <span>{row.labTest.name}</span>
          {row.labTest.specimenType ? (
            <span className="text-xs text-muted-foreground capitalize">
              {row.labTest.specimenType}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={toStatusTone(row.status)} />,
    },
    {
      id: "payment",
      header: "Payment",
      hiddenOnMobile: true,
      cell: (row) => (
        <StatusBadge status={row.paidAt ? "paid" : "unpaid"} />
      ),
    },
    {
      id: "result",
      header: "Result",
      hiddenOnMobile: true,
      cell: (row) =>
        row.resultUploadedAt ? (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.resultUploadedAt, DATE_FORMAT_OPTIONS_US_SHORT)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <LabOrderRowActions
          order={row}
          canVerifyPayment={canVerifyPayment}
          disabled={isMutating}
          onRecordSample={handleRecordSample}
          onUploadResult={handleUploadResult}
          onVerifyPayment={handleVerifyPayment}
          onRelease={handleRelease}
        />
      ),
    },
  ];

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Lab Workspace"
          description="Receive samples, upload results, and release reports to patients."
          actions={
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => refetch()}
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          }
        />
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:max-w-xs sm:flex-1">
          <SearchInput
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder="Search by patient name"
            ariaLabel="Search lab queue by patient name"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            const found = STATUS_OPTIONS.find((o) => o.value === value);
            if (found) setStatusFilter(found.value);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataState
        status={status}
        loadingMessage="Loading lab queue…"
        emptyTitle="No lab orders"
        emptyDescription="Orders raised for the lab will appear here."
        onRetry={() => refetch()}
      >
        <DataTable data={queue} columns={columns} rowKey={(row) => row.id} />
      </DataState>
    </AppPageScaffold>
  );
};
