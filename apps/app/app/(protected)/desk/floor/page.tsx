"use client";

import { Feature, Tier } from "@workspace/types";
import {
  FeatureGate,
  TierGate,
} from "@/components/auth/feature-gate";
import { DeskFloorPanelContainer } from "@/features/desk/components/DeskFloorPanelContainer";

export default function DeskFloorPage() {
  return <DeskFloorPanelContainer />;
}
