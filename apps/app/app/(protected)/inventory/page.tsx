"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { InventoryPageUI } from "@/features/inventory/components";

export default function InventoryPage() {
  return (
    <FeatureGate feature={Feature.INVENTORY} showLockedCard>
      <InventoryPageUI />
    </FeatureGate>
  );
}
