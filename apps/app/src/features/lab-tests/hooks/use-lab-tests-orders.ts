import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useVerifyLabOrderPayment } from "@workspace/data-access";
import { getPatientFullName } from "@workspace/utils";
import type { LabTestOrder } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export type OrderSortKey = "patient" | "testName" | "orderDate" | "status";
export type OrderSortConfig =
  | { key: OrderSortKey; direction: "asc" | "desc" }
  | null;

export function useLabTestsOrders(filteredTests: LabTestOrder[]) {
  const [sortConfig, setSortConfig] = useState<OrderSortConfig>(null);
  const verifyPayment = useVerifyLabOrderPayment();

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
          cmp = getPatientFullName(a.patient ?? null).localeCompare(
            getPatientFullName(b.patient ?? null),
          );
          break;
        case "testName":
          cmp = (a.labTest?.name ?? "").localeCompare(
            b.labTest?.name ?? "",
          );
          break;
        case "orderDate":
          cmp =
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime();
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

  return {
    sortConfig,
    handleSort,
    sortedTests,
    handleVerify,
    isVerifying: verifyPayment.isPending,
  };
}
