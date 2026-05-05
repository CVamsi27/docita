"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { DeskCollectPaymentPageUI } from "@/features/desk/components/DeskCollectPaymentPageUI";

export default function DeskCollectPaymentPage() {
  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
      <DeskCollectPaymentPageUI />
    </FeatureGate>
  );
}
