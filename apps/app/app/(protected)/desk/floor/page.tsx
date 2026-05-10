"use client";

import { Feature, Tier } from "@workspace/types";
import {
  FeatureGate,
  TierGate,
} from "@/features/_shared/components/auth/feature-gate";
import { DeskFloorPanelContainer } from "@/features/desk/components/DeskFloorPanelContainer";

export default function DeskFloorPage() {
  return (
    <TierGate tier={Tier.HOSPITAL} showLockedCard>
      <FeatureGate feature={Feature.QUEUE_MANAGEMENT} showLockedCard>
        <DeskFloorPanelContainer />
      </FeatureGate>
    </TierGate>
  );
}
