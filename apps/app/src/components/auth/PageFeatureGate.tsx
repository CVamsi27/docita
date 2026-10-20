import type { ReactNode } from "react";
import type { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { LockedFeaturePage } from "@/components/auth/LockedFeaturePage";

interface PageFeatureGateProps {
  feature: Feature;
  title: string;
  description?: string;
  children: ReactNode;
}

export function PageFeatureGate({
  feature,
  title,
  description,
  children,
}: PageFeatureGateProps) {
  return (
    <FeatureGate
      feature={feature}
      fallback={
        <LockedFeaturePage
          feature={feature}
          title={title}
          description={description}
        />
      }
    >
      {children}
    </FeatureGate>
  );
}
