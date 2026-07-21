// fallow-ignore-file coverage-gaps
import { ArrowUp, ArrowDown, ArrowUpDown, FileText, ShieldCheck } from "lucide-react";
import { FC } from "react";
import { getPatientFullName } from "@workspace/utils";
import {
  Button,
  DataTable,
  ListRow,
  LoadingState,
  SearchInput,
  StatusBadge,
  SymbolTooltip,
  type DataTableColumn
} from "@workspace/ui/components";
import type { LabTestOrder } from "@workspace/types";
import { useAuth } from "@/lib/auth/auth-context";
import { DATE_FORMAT_OPTIONS_US_SHORT, formatDate } from "@/lib/formatters";
import {
  useLabTestsOrders, type OrderSortKey, type OrderSortConfig,
} from "./use-lab-tests-orders";

const PAYMENT_ROLES = new Set(["ADMIN", "ADMIN_DOCTOR", "RECEPTIONIST"]);

/* ─── Subcomponents ─────────────────────────────────────────── */

export function SortableHeader({
  label, column, sortConfig, onSort,
}: {
  label: string;
  column: OrderSortKey;
  sortConfig: OrderSortConfig;
  onSort: (key: OrderSortKey) => void;
}) {
  return (
    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onSort(column)}>
      {label}
      {sortConfig?.key === column ? (
        sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}

export function LabOrderActionsCell({
  test, canVerifyPayment, handleVerify, isVerifying,
}: {
  test: LabTestOrder;
  canVerifyPayment: boolean;
  handleVerify: (order: LabTestOrder) => void;
  isVerifying: boolean;
}) {
  const isPaid = Boolean(test.paidAt);
  return (
    <div className="flex items-center justify-end gap-1">
      {canVerifyPayment && !isPaid ? (
        <Button variant="outline" size="sm" className="gap-1" disabled={isVerifying}
          onClick={() => handleVerify(test)}>
          <ShieldCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Verify</span>
        </Button>
      ) : null}
      <SymbolTooltip label={test.status === "completed" ? "View results" : "Details"}>
        <Button variant="ghost" size="sm" className="gap-1">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">{test.status === "completed" ? "View Results" : "Details"}</span>
        </Button>
      </SymbolTooltip>
    </div>
  );
}

export function LabOrderMobileRow({ test }: { test: LabTestOrder }) {
  return (
    <ListRow
      title={test.patient ? getPatientFullName(test.patient) : "Unknown"}
      meta={[test.labTest?.name || "—", test.labTest?.category || null].filter(Boolean).join(" · ")}
      time={formatDate(test.createdAt, DATE_FORMAT_OPTIONS_US_SHORT)}
      status={test.status} showChevron={false}
    />
  );
}

export function PatientNameCell({ test }: { test: LabTestOrder }) {
  return <span className="font-medium">{test.patient ? getPatientFullName(test.patient) : "Unknown"}</span>;
}

export function CategoryCell({ test }: { test: LabTestOrder }) {
  return <span className="capitalize text-muted-foreground">{test.labTest?.category || "—"}</span>;
}

export function OrderedByCell({ test }: { test: LabTestOrder }) {
  return <span className="text-muted-foreground">{test.doctor?.name || "—"}</span>;
}

export function PaymentStatusCell({ test }: { test: LabTestOrder }) {
  return <StatusBadge status={test.paidAt ? "paid" : "unpaid"} />;
}

/* ─── Props ──────────────────────────────────────────────────── */

interface LabTestsOrdersProps {
  isLoading: boolean;
  filteredTests: LabTestOrder[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

/* ─── Main component ────────────────────────────────────────── */

export const LabTestsOrders: FC<LabTestsOrdersProps> = ({
  isLoading, filteredTests, searchQuery, setSearchQuery,
}) => {
  const { user } = useAuth();
  const canVerifyPayment = user?.role !== undefined && PAYMENT_ROLES.has(user.role);
  const { sortConfig, handleSort, sortedTests, handleVerify, isVerifying } = useLabTestsOrders(filteredTests);

  const columns: DataTableColumn<LabTestOrder>[] = [
    { id: "patient", header: <SortableHeader label="Patient" column="patient" {...{ sortConfig, onSort: handleSort }} />, cell: (test) => <PatientNameCell test={test} /> },
    { id: "testName", header: <SortableHeader label="Test Name" column="testName" {...{ sortConfig, onSort: handleSort }} />, cell: (test) => test.labTest?.name || "—" },
    { id: "category", header: "Category", hiddenOnMobile: true, cell: (test) => <CategoryCell test={test} /> },
    { id: "orderedBy", header: "Ordered By", hiddenOnMobile: true, cell: (test) => <OrderedByCell test={test} /> },
    { id: "orderDate", header: <SortableHeader label="Order Date" column="orderDate" {...{ sortConfig, onSort: handleSort }} />, hiddenOnMobile: true, cell: (test) => formatDate(test.createdAt, DATE_FORMAT_OPTIONS_US_SHORT) },
    { id: "status", header: <SortableHeader label="Status" column="status" {...{ sortConfig, onSort: handleSort }} />, cell: (test) => <StatusBadge status={test.status} /> },
    { id: "payment", header: "Payment", cell: (test) => <PaymentStatusCell test={test} /> },
    {
      id: "actions", header: "Actions", align: "right",
      cell: (test) => <LabOrderActionsCell test={test} canVerifyPayment={canVerifyPayment} handleVerify={handleVerify} isVerifying={isVerifying} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-4">
        <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")} placeholder="Enter patient, test, or doctor" ariaLabel="Search lab test orders" />
      </div>
      {isLoading ? <LoadingState message="Loading lab tests…" /> : (
        <DataTable columns={columns} data={sortedTests} rowKey={(test) => test.id}
          emptyTitle="No lab tests found" emptyDescription="Lab test orders will appear here"
          stackOnMobile mobileRenderer={(test) => <LabOrderMobileRow test={test} />} className="ui-card-surface" />
      )}
    </div>
  );
};
