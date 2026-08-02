import { ArrowUp, ArrowDown, ArrowUpDown, FileText, ShieldCheck } from "lucide-react";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { getPatientFullName } from "@workspace/utils";
import { Button, DataTable, ListRow, LoadingState, SearchInput, StatusBadge, SymbolTooltip, type DataTableColumn } from "@workspace/ui/components";
import type { LabTestOrder } from "@workspace/types";
import { useAuth } from "@/lib/auth/auth-context";
import { DATE_FORMAT_OPTIONS_US_SHORT, formatDate } from "@/lib/formatters";
import { useLabTestsOrders, type OrderSortKey, type OrderSortConfig } from "@/features/lab-tests/hooks/use-lab-tests-orders";

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
  const { t } = useTranslation("LabTests");
  return (
    <Button variant="ghost" size="sm" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onSort(column)} aria-label={t("orders.sortBy", { label })}>
      {label}
      {sortConfig?.key === column ? (
        sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </Button>
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
  const { t } = useTranslation("LabTests");
  const isPaid = Boolean(test.paidAt);
  return (
    <div className="flex items-center justify-end gap-1">
      {canVerifyPayment && !isPaid ? (
        <Button variant="outline" size="sm" className="gap-1" disabled={isVerifying}
          onClick={() => handleVerify(test)}>
          <ShieldCheck className="h-4 w-4" />
          <span className="hidden sm:inline">{t("orders.verify")}</span>
        </Button>
      ) : null}
      <SymbolTooltip label={test.status === "completed" ? t("orders.viewResults") : t("orders.details")}>
        <Button variant="ghost" size="sm" className="gap-1">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">{test.status === "completed" ? t("orders.viewResults") : t("orders.details")}</span>
        </Button>
      </SymbolTooltip>
    </div>
  );
}

export function LabOrderMobileRow({ test }: { test: LabTestOrder }) {
  const { t } = useTranslation("LabTests");
  return (
    <ListRow
      title={test.patient ? getPatientFullName(test.patient) : t("orders.unknown")}
      meta={[test.labTest?.name || "—", test.labTest?.category || null].filter(Boolean).join(" · ")}
      time={formatDate(test.createdAt, DATE_FORMAT_OPTIONS_US_SHORT)}
      status={test.status} showChevron={false}
    />
  );
}

export function PatientNameCell({ test }: { test: LabTestOrder }) {
  const { t } = useTranslation("LabTests");
  return <span className="font-medium">{test.patient ? getPatientFullName(test.patient) : t("orders.unknown")}</span>;
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
  const { t } = useTranslation("LabTests");
  const { user } = useAuth();
  const canVerifyPayment = user?.role !== undefined && PAYMENT_ROLES.has(user.role);
  const { sortConfig, handleSort, sortedTests, handleVerify, isVerifying } = useLabTestsOrders(filteredTests);

  const columns: DataTableColumn<LabTestOrder>[] = [
    { id: "patient", header: <SortableHeader label={t("orders.patient")} column="patient" {...{ sortConfig, onSort: handleSort }} />, cell: (test) => <PatientNameCell test={test} /> },
    { id: "testName", header: <SortableHeader label={t("orders.testName")} column="testName" {...{ sortConfig, onSort: handleSort }} />, cell: (test) => test.labTest?.name || "—" },
    { id: "category", header: t("orders.category"), hiddenOnMobile: true, cell: (test) => <CategoryCell test={test} /> },
    { id: "orderedBy", header: t("orders.orderedBy"), hiddenOnMobile: true, cell: (test) => <OrderedByCell test={test} /> },
    { id: "orderDate", header: <SortableHeader label={t("orders.orderDate")} column="orderDate" {...{ sortConfig, onSort: handleSort }} />, hiddenOnMobile: true, cell: (test) => formatDate(test.createdAt, DATE_FORMAT_OPTIONS_US_SHORT) },
    { id: "status", header: <SortableHeader label={t("orders.status")} column="status" {...{ sortConfig, onSort: handleSort }} />, cell: (test) => <StatusBadge status={test.status} /> },
    { id: "payment", header: t("orders.payment"), cell: (test) => <PaymentStatusCell test={test} /> },
    {
      id: "actions", header: t("orders.actions"), align: "right",
      cell: (test) => <LabOrderActionsCell test={test} canVerifyPayment={canVerifyPayment} handleVerify={handleVerify} isVerifying={isVerifying} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-4">
        <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")} placeholder={t("orders.searchPlaceholder")} ariaLabel={t("orders.searchAriaLabel")} />
      </div>
      {isLoading ? <LoadingState message={t("orders.loading")} /> : (
        <DataTable columns={columns} data={sortedTests} rowKey={(test) => test.id}
          emptyTitle={t("orders.emptyTitle")} emptyDescription={t("orders.emptyDescription")}
          stackOnMobile mobileRenderer={(test) => <LabOrderMobileRow test={test} />} className="ui-card-surface" />
      )}
    </div>
  );
};
