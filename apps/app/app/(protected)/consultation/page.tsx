"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { ConsultationDashboardUI } from "@/features/consultation/components/ConsultationDashboardUI";

export default function ConsultationPage() {
  return <ConsultationDashboardUI />;
}
