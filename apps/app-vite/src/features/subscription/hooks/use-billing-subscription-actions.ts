import { useCallback, useRef, useState } from "react";
import {
  useCancelScheduledPlanChange,
  useSchedulePlanChange,
} from "@workspace/data-access";
import type { PlanMode, TierName } from "@workspace/types";

type CheckoutFn = (opts: {
  tier: TierName;
  billingCycle: "MONTHLY" | "YEARLY";
  planMode: PlanMode;
}) => Promise<void>;

export function useBillingSubscriptionActions(
  checkoutTier: CheckoutFn,
  setShowContactSalesModal: (v: boolean) => void,
) {
  const scheduleMutation = useSchedulePlanChange();
  const cancelScheduledMutation = useCancelScheduledPlanChange();
  const [showTierChangeDialog, setShowTierChangeDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierName | null>(null);
  const [selectedMode, setSelectedMode] = useState<PlanMode>("FULL");
  const [selectedCycle, setSelectedCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [legalDialog, setLegalDialog] = useState<null | "terms" | "privacy">(null);
  const plansRef = useRef<HTMLDivElement>(null);

  const handleSelectTier = useCallback(
    (tier: TierName, cycle: "MONTHLY" | "YEARLY", mode: PlanMode = "FULL") => {
      setSelectedTier(tier);
      setSelectedCycle(cycle);
      setSelectedMode(mode);
      setShowTierChangeDialog(true);
    },
    [],
  );

  const handleConfirmTierChange = useCallback(async () => {
    if (!selectedTier) return;
    if (selectedTier === "ENTERPRISE") {
      setShowTierChangeDialog(false);
      setShowContactSalesModal(true);
      return;
    }
    await checkoutTier({
      tier: selectedTier,
      billingCycle: selectedCycle,
      planMode: selectedMode,
    });
    setShowTierChangeDialog(false);
  }, [
    selectedTier,
    selectedCycle,
    selectedMode,
    checkoutTier,
    setShowContactSalesModal,
  ]);

  const handleScheduleTierChange = useCallback(async () => {
    if (!selectedTier) return;
    await scheduleMutation.mutateAsync({
      tier: selectedTier,
      billingCycle: selectedCycle,
      planMode: selectedMode,
    });
    setShowTierChangeDialog(false);
  }, [selectedTier, selectedCycle, selectedMode, scheduleMutation]);

  return {
    scheduleMutation,
    cancelScheduledMutation,
    showTierChangeDialog,
    setShowTierChangeDialog,
    selectedTier,
    selectedCycle,
    setSelectedCycle,
    selectedMode,
    setSelectedMode,
    showInvoiceHistory,
    setShowInvoiceHistory,
    legalDialog,
    setLegalDialog,
    plansRef,
    handleSelectTier,
    handleConfirmTierChange,
    handleScheduleTierChange,
  };
}
