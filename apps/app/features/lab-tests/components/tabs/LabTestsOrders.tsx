import { getPatientFullName } from "@workspace/utils";
import { FC, useState, useMemo } from "react";
import { Button } from "@workspace/ui/components/form/button";
import { SearchInput } from "@workspace/ui/components/form/search-input";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { FileText, ShieldCheck, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-display/data-table";
import { ListRow } from "@workspace/ui/components/data-display/list-row";
import type { LabTestOrder } from "@workspace/types";
import { useVerifyLabOrderPayment } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { DATE_FORMAT_OPTIONS_US_SHORT, formatDate } from "@/lib/formatters";

const PAYMENT_ROLES = new Set(["ADMIN", "ADMIN_DOCTOR", "RECEPTIONIST"]);

type OrderSortKey = "patient" | "testName" | "orderDate" | "status";
type OrderSortConfig = { key: OrderSortKey; direction: "asc" | "desc" } | null;

function SortableHeader({
  label,
  column,
  sortConfig,
  onSort,
}: {
  label: string;
  column: OrderSortKey;
  sortConfig: OrderSortConfig;
  onSort: (key: OrderSortKey) => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() => onSort(column)}
    >
      {label}
      {sortConfig?.key === column ? (
        sortConfig.direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}

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
  const { user } = useAuth();
  const canVerifyPayment =
    user?.role !== undefined && PAYMENT_ROLES.has(user.role);
  const verifyPayment = useVerifyLabOrderPayment();
  const [sortConfig, setSortConfig] = useState<OrderSortConfig>(null);

  const handleSort = (key: OrderSortKey) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const sortedTests = useMemo(() => {
    if (!sortConfig) return filteredTests;
    return [...filteredTests].sort((a, b) => {
      let cmp = 0;
      switch (sortConfig.key) {
        case "patient":
          cmp = getPatientFullName(a.patient ?? null).localeCompare(getPatientFullName(b.patient ?? null));
          break;
        case "testName":
          cmp = (a.labTest?.name ?? "").localeCompare(b.labTest?.name ?? "");
          break;
        case "orderDate":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "status":
          cmp = (a.status ?? "").localeCompare(b.status ?? "");
          break;
      }
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [filteredTests, sortConfig]);

  const handleVerify = (order: LabTestOrder) => {
    verifyPayment.mutate(
      { id: order.id, paymentMethod: "CASH" },
      {
        onSuccess: () => toast.success("Payment verified"),
        onError: (error) => showUserFacingErrorToast(error),
      },
    );
  };

  const isPaid = (order: LabTestOrder) => Boolean(order.paidAt);

  const columns: DataTableColumn<LabTestOrder>[] = [
    {
      id: "patient",
      header: (
        <SortableHeader
          label="Patient"
          column="patient"
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      ),
      cell: (test) => (
        <span className="font-medium">
          {test.patient ? getPatientFullName(test.patient) : "Unknown"}
        </span>
      ),
    },
    {
      id: "testName",
      header: (
        <SortableHeader
          label="Test Name"
          column="testName"
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      ),
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
      header: (
        <SortableHeader
          label="Order Date"
          column="orderDate"
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      ),
      hiddenOnMobile: true,
      cell: (test) => formatDate(test.createdAt, DATE_FORMAT_OPTIONS_US_SHORT),
    },
    {
      id: "status",
      header: (
        <SortableHeader
          label="Status"
          column="status"
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      ),
      cell: (test) => <StatusBadge status={test.status} />,
    },
    {
      id: "payment",
      header: "Payment",
      cell: (test) => (
        <StatusBadge
          status={isPaid(test) ? "paid" : "unpaid"}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (test) => (
        <div className="flex items-center justify-end gap-1">
          {canVerifyPayment && !isPaid(test) ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={verifyPayment.isPending}
              onClick={() => handleVerify(test)}
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Verify</span>
            </Button>
          ) : null}
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
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-4">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
          placeholder="Enter patient, test, or doctor"
          ariaLabel="Search lab test orders"
        />
      </div>

      {isLoading ? (
        <LoadingState message="Loading lab tests…" />
      ) : (
        <DataTable
          columns={columns}
          data={sortedTests}
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
    </div>
  );
};
