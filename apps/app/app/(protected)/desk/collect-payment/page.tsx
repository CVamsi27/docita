"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { DeskCollectPaymentPageUI } from "@/features/desk/components/DeskCollectPaymentPageUI";

export default function DeskCollectPaymentPage() {
  return <DeskCollectPaymentPageUI />;
}
